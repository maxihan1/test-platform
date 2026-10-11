// E2E 다음 단계 추천 — 지도 ② 화면 → 화면 연결 → 이어지는 화면에 닿는 케이스 (도메인/시나리오 §3.7 · §7 GET /api/scenarios/next-cases)

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 다음케이스들 } from './next.js';
import scenarioRoutes from './routes.js';

describe('다음케이스들', () => {
  const 화면들 = [
    { tcId: 'MKT-FN-021', url: '/product/7' },
    { tcId: 'MKT-FN-022', url: '/cart' },
    { tcId: 'MKT-FN-023', url: '/cart?page=2' },
    { tcId: 'MKT-FN-030', url: '/order' },
    { tcId: 'MKT-FN-030', url: '/cart' },
    { tcId: 'MKT-FN-040', url: '/product/9' },
    { tcId: 'MKT-UI-001', url: '/cart' },
    { tcId: 'MKT-FN-050', url: '/mypage' },
  ];
  const 연결들 = [
    { from: '/product/:n', to: '/cart' },
    { from: '/product/:n', to: '/order' },
    { from: '/product/:n', to: '/product/:n' },
    { from: '/cart', to: '/mypage' },
  ];

  it('머문 화면을 같은 틀로 바꿔 나간 연결을 찾고, 도착 화면에 닿는 케이스를 받은 차례로 낸다', () => {
    expect(다음케이스들('MKT-FN-021', 화면들, 연결들)).toEqual([
      { tcId: 'MKT-FN-022', screen: '/cart' },
      { tcId: 'MKT-FN-023', screen: '/cart' },
      { tcId: 'MKT-FN-030', screen: '/order' },
    ]);
  });

  it('같은 화면으로 돌아오는 연결 · UI 테스트 · 앞 케이스 자신은 추천하지 않는다', () => {
    const 고른 = 다음케이스들('MKT-FN-021', 화면들, 연결들).map((x) => x.tcId);
    expect(고른).not.toContain('MKT-FN-040');
    expect(고른).not.toContain('MKT-UI-001');
    expect(고른).not.toContain('MKT-FN-021');
  });

  it('앞 케이스가 여러 화면을 쓰면 그 화면끼리의 연결은 다음 화면이 아니다', () => {
    expect(다음케이스들('MKT-FN-030', 화면들, [...연결들, { from: '/cart', to: '/order' }, { from: '/order', to: '/cart' }])).toEqual([
      { tcId: 'MKT-FN-050', screen: '/mypage' },
    ]);
  });

  it('앞 케이스의 화면 주소가 없거나 나간 연결이 없으면 빈 목록이다', () => {
    expect(다음케이스들('MKT-FN-099', 화면들, 연결들)).toEqual([]);
    expect(다음케이스들('MKT-FN-030', 화면들, [])).toEqual([]);
  });
});

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XNC';
const 케이스들 = ['XNC-FN-001', 'XNC-FN-002', 'XNC-FN-003', 'XNC-FN-004'];

describe.skipIf(연결 === undefined)('GET /api/scenarios/next-cases', () => {
  let app: FastifyInstance;
  let 서비스 = 0;

  const q = async (sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<Record<string, unknown>>(sql, 값);
  };
  const 읽기 = async (질의: string) => {
    const r = await app.inject({ method: 'GET', url: `/api/scenarios/next-cases?${질의}` });
    return { status: r.statusCode, body: r.json() as { items?: { tcId: string; screen: string }[] } };
  };
  const 치우기 = async () => {
    await q('DELETE FROM screen_link WHERE service_id = $1', [서비스]);
    await q('DELETE FROM case_screen WHERE tc_id = ANY($1)', [케이스들]);
    await q('DELETE FROM test_case WHERE tc_id = ANY($1)', [케이스들]);
  };

  beforeAll(async () => {
    const s = await q(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, $2, '#3A5FCD', '', 'xnc')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
      [접두사, `${접두사} 다음 단계 추천 검사용`],
    );
    서비스 = Number(s.rows[0]!.id);
    await 치우기();
    for (const tc of 케이스들) {
      await q(
        `INSERT INTO test_case (tc_id, name, file_path, param_schema, expected_schema, is_active)
         VALUES ($1, '검사', 'tests/xnc/a.spec.ts', '{}', '{}', $2)`,
        [tc, tc !== 'XNC-FN-004'],
      );
    }
    await q(
      `INSERT INTO case_screen (tc_id, file, screen_url)
       VALUES ('XNC-FN-001', 'tests/xnc/pages/product.page.ts', '/product/1'),
              ('XNC-FN-001', 'tests/xnc/components/nav.component.ts', NULL),
              ('XNC-FN-002', 'tests/xnc/pages/cart.page.ts', '/cart'),
              ('XNC-FN-003', 'tests/xnc/pages/order.page.ts', '/order'),
              ('XNC-FN-004', 'tests/xnc/pages/cart.page.ts', '/cart')`,
    );
    await q(
      `INSERT INTO screen_link (service_id, state, from_url, to_url, via)
       VALUES ($1, '로그인', '/product/:n', '/cart', '장바구니 담기'),
              ($1, '로그아웃', '/product/:n', '/cart', '장바구니'),
              ($1, '로그인', '/cart', '/order', '주문하기')`,
      [서비스],
    );
    app = Fastify();
    await app.register(scenarioRoutes, { prefix: '/api' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await 치우기();
    await q('DELETE FROM service WHERE id = $1', [서비스]);
  });

  it('머문 화면에서 이어지는 화면의 활성 케이스만 한 번씩 낸다 — 상태가 다른 같은 연결은 하나다', async () => {
    expect(await 읽기(`service=${접두사}&after=XNC-FN-001`)).toEqual({ status: 200, body: { items: [{ tcId: 'XNC-FN-002', screen: '/cart' }] } });
    expect((await 읽기(`service=${접두사}&after=XNC-FN-002`)).body.items).toEqual([{ tcId: 'XNC-FN-003', screen: '/order' }]);
  });

  it('남의 서비스 케이스 · 빈 after · 두 번 붙인 after 는 빈 목록이고, 서비스가 없으면 400 이다', async () => {
    expect((await 읽기(`service=${접두사}&after=MKT-FN-001`)).body.items).toEqual([]);
    expect((await 읽기(`service=${접두사}`)).body.items).toEqual([]);
    expect((await 읽기(`service=${접두사}&after=XNC-FN-001&after=XNC-FN-002`)).body.items).toEqual([]);
    expect((await 읽기('after=XNC-FN-001')).status).toBe(400);
  });
});
