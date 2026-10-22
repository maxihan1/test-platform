// E2E 다음 단계 추천 — 지도 ② 화면 → 화면 연결 → 이어지는 화면에 닿는 케이스 (도메인/시나리오 §3.7 · §7 GET /api/scenarios/next-cases)

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 다음케이스들, 첫케이스들, 출발틀들 } from './next.js';
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
  const 줄 = (from: string, to: string, via = `버튼 「${to}」`, state = '로그인:일반 회원') => ({ state, from, to, via });
  const 연결들 = [줄('/product/:n', '/cart'), 줄('/product/:n', '/order'), 줄('/product/:n', '/product/:n'), 줄('/cart', '/mypage')];

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
    expect(다음케이스들('MKT-FN-030', 화면들, [...연결들, 줄('/cart', '/order'), 줄('/order', '/cart')])).toEqual([
      { tcId: 'MKT-FN-050', screen: '/mypage' },
    ]);
  });

  it('같은 상태 화면 절반 넘게에 같은 글자로 있는 링크(머리 · 바닥 메뉴)는 뺀다 — 그 화면에만 있는 버튼은 남고, 글자 속 숫자는 안 가른다 (PRD-F9-21)', () => {
    const 머리 = ['/product/:n', '/cart', '/order', '/mypage', '/'].flatMap((from) => [
      줄(from, '/cart', `링크 「🛒${from.length} 장바구니」`),
      줄(from, '/mypage', '링크 「마이페이지」'),
    ]);
    expect(다음케이스들('MKT-FN-021', 화면들, [...머리, 줄('/product/:n', '/cart', '버튼 「장바구니 담기」')])).toEqual([
      { tcId: 'MKT-FN-022', screen: '/cart' },
      { tcId: 'MKT-FN-023', screen: '/cart' },
      { tcId: 'MKT-FN-030', screen: '/cart' },
    ]);
    expect(다음케이스들('MKT-FN-021', 화면들, 머리)).toEqual([]);
    // 상태마다 따로 센다 — 로그아웃 화면은 하나뿐이라 그 링크는 머리 메뉴로 보지 않는다
    expect(다음케이스들('MKT-FN-021', 화면들, [...머리, 줄('/product/:n', '/mypage', '링크 「마이페이지」', '로그아웃')])).toEqual([{ tcId: 'MKT-FN-050', screen: '/mypage' }]);
  });

  it('화면 파일 주소의 `:id` · 인자 꼬리도 크롤러 같은 틀에 맞춘다 (PRD-F9-04)', () => {
    const 파일들 = [{ tcId: 'MKT-FN-061', url: '/board/:id' }, { tcId: 'MKT-FN-062', url: '/board' }];
    expect(다음케이스들('MKT-FN-061', 파일들, [줄('/board/:n', '/board?category=자유', '링크 「목록」')])).toEqual([{ tcId: 'MKT-FN-062', screen: '/board' }]);
    expect(다음케이스들('MKT-FN-062', 파일들, [줄('/board?category=자유', '/board/:n', '링크 「첫 글」')])).toEqual([{ tcId: 'MKT-FN-061', screen: '/board/:n' }]);
  });

  it('앞 케이스의 화면 주소가 없거나 나간 연결이 없으면 빈 목록이다', () => {
    expect(다음케이스들('MKT-FN-099', 화면들, 연결들)).toEqual([]);
    expect(다음케이스들('MKT-FN-030', 화면들, [])).toEqual([]);
  });
});

describe('첫 단계 후보 (결정 15)', () => {
  const 화면들 = [
    { tcId: 'MKO-FN-001', url: '/ops' },
    { tcId: 'MKO-FN-002', url: '/ops/login' },
    { tcId: 'MKO-FN-003', url: '/ops/orders/7' },
    { tcId: 'MKO-UI-001', url: '/ops/login' },
    { tcId: 'MKO-FN-004', url: '/ops/settings' },
  ];
  const 줄 = (from: string, to: string, via: string, state = '로그아웃') => ({ state, from, to, via });

  it('대상 서버 주소의 경로가 출발 화면이다 — 경로가 없거나 그 화면 기록이 없으면 `/` 다', () => {
    const 기록 = new Set(['/', '/ops']);
    expect(출발틀들(['http://h:3002/ops', 'http://h:3002/ops/'], 기록)).toEqual(['/ops']);
    expect(출발틀들(['http://h/#/ops'], new Set(['/#/ops']))).toEqual(['/#/ops']);
    expect(출발틀들(['http://h:3001', 'http://h:3001/없는곳', '주소 아님'], 기록)).toEqual(['/']);
    expect(출발틀들(['http://a/ops', 'http://b'], 기록)).toEqual(['/ops', '/']);
  });

  it('출발 화면과 화면 연결 한 번으로 닿는 화면의 케이스를 낸다 — 메뉴 링크도 쓰고 UI 테스트는 뺀다', () => {
    const 메뉴 = ['/ops', '/ops/login', '/ops/orders/:n', '/ops/settings'].map((from) => 줄(from, '/ops/login', '링크 「로그인」'));
    expect(첫케이스들(['/ops'], new Set(['/ops']), 화면들, [...메뉴, 줄('/ops/login', '/ops/settings', '링크 「설정」')])).toEqual([
      { tcId: 'MKO-FN-001', screen: '/ops' },
      { tcId: 'MKO-FN-002', screen: '/ops/login' },
    ]);
    expect(첫케이스들(['/ops'], new Set(['/ops']), 화면들, [줄('/ops', '/ops/orders/:n', '링크 「첫 주문」', '로그인:운영자')])).toEqual([
      { tcId: 'MKO-FN-001', screen: '/ops' },
      { tcId: 'MKO-FN-003', screen: '/ops/orders/:n' },
    ]);
  });

  it('출발 화면 기록이 없으면 빈 목록이다', () => {
    expect(첫케이스들(['/'], new Set(['/ops']), 화면들, [줄('/', '/ops/login', '링크 「로그인」')])).toEqual([]);
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
    await q('DELETE FROM screen_record WHERE service_id = $1', [서비스]);
    await q('DELETE FROM service_env WHERE service_id = $1', [서비스]);
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
      `INSERT INTO screen_link (service_id, env, state, from_url, to_url, via)
       VALUES ($1, 'qa', '로그인:일반 회원', '/product/:n', '/cart', '장바구니 담기'),
              ($1, 'qa', '로그아웃', '/product/:n', '/cart', '장바구니'),
              ($1, 'prod', '로그인:일반 회원', '/cart', '/order', '주문하기')`,
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

  it('머문 화면에서 이어지는 화면의 활성 케이스만 한 번씩 낸다 — 상태 · 대상 서버가 다른 같은 연결은 하나다', async () => {
    expect(await 읽기(`service=${접두사}&after=XNC-FN-001`)).toEqual({ status: 200, body: { items: [{ tcId: 'XNC-FN-002', screen: '/cart' }] } });
    expect((await 읽기(`service=${접두사}&after=XNC-FN-002`)).body.items).toEqual([{ tcId: 'XNC-FN-003', screen: '/order' }]);
  });

  it('남의 서비스 케이스 · 빈 after · 두 번 붙인 after 는 빈 목록이고, 서비스가 없으면 400 이다', async () => {
    expect((await 읽기(`service=${접두사}&after=MKT-FN-001`)).body.items).toEqual([]);
    expect((await 읽기(`service=${접두사}&after=`)).body.items).toEqual([]);
    expect((await 읽기(`service=${접두사}&after=XNC-FN-001&after=XNC-FN-002`)).body.items).toEqual([]);
    expect((await 읽기('after=XNC-FN-001')).status).toBe(400);
  });

  it('after 칸이 아예 없으면 첫 단계 후보다 — 출발 화면 기록이 없으면 빈 목록이고, 생기면 대상 서버 경로에서 닿는 활성 케이스다', async () => {
    expect((await 읽기(`service=${접두사}`)).body.items).toEqual([]);
    await q("INSERT INTO service_env (service_id, env, base_url) VALUES ($1, 'qa', 'http://xnc.test/product/1')", [서비스]);
    await q(
      `INSERT INTO screen_record (service_id, env, state, url, name, text_fp, struct_fp, record, crawled_at)
       VALUES ($1, 'qa', '로그아웃', '/product/:n', '상품', '', '', '', now())`,
      [서비스],
    );
    expect((await 읽기(`service=${접두사}`)).body.items).toEqual([
      { tcId: 'XNC-FN-001', screen: '/product/:n' },
      { tcId: 'XNC-FN-002', screen: '/cart' },
    ]);
  });
});
