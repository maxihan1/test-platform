// 설정의 화면 크기 판정 읽기 — 대상 서버 줄의 판정 · 시각과 화면별 차이 통로 (SPEC 도메인/인증 §7 · PRD-F10-08).
// CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import settingsRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XVP';

const 같음 = { 넘침: false, 선언: true, 구조같음: true, PC만: [], 모바일만: [] };
const 다름 = { 넘침: false, 선언: true, 구조같음: false, PC만: ['장바구니 담기'], 모바일만: ['메뉴 열기'] };

describe.skipIf(연결 === undefined)('설정의 화면 크기 판정 읽기', () => {
  let app: FastifyInstance;
  let 번호 = 0;

  const pool = async () => (await import('../db/index.js')).pool;

  async function 치운다(): Promise<void> {
    const p = await pool();
    const 서비스 = 'SELECT id FROM service WHERE prefix = $1';
    await p.query(`DELETE FROM screen_found WHERE service_id IN (${서비스})`, [접두사]);
    await p.query(`DELETE FROM service_env WHERE service_id IN (${서비스})`, [접두사]);
    await p.query('DELETE FROM service WHERE prefix = $1', [접두사]);
  }

  beforeAll(async () => {
    app = Fastify();
    await app.register(settingsRoutes, { prefix: '/api' });
    await app.ready();
    await 치운다();
    const res = await app.inject({
      method: 'POST',
      url: '/api/settings/services',
      payload: {
        prefix: 접두사,
        name: '화면 크기',
        color: '#112233',
        testsRepo: '',
        testsDir: 'xvp',
        envs: [{ env: 'qa', baseUrl: 'https://qa.xvp.test' }, { env: 'live', baseUrl: 'https://xvp.test' }],
      },
    });
    번호 = res.json<{ id: number }>().id;
    const p = await pool();
    await p.query("UPDATE service_env SET viewport_kind = 'responsive', viewport_judged_at = '2026-10-16T10:40:00Z' WHERE service_id = $1 AND env = 'qa'", [번호]);
    await p.query(
      `INSERT INTO screen_found (service_id, env, state, url, name, viewport) VALUES
         ($1, 'qa', '로그아웃', '/goods', '상품 목록', $2), ($1, 'qa', '로그아웃', '/', '홈', $3),
         ($1, 'qa', '로그아웃', '/popup', '팝업', NULL), ($1, 'live', '로그아웃', '/goods', '상품 목록', $2)`,
      [번호, JSON.stringify(다름), JSON.stringify(같음)],
    );
  });

  afterAll(async () => {
    await 치운다();
    await app.close();
    await (await pool()).end();
  });

  it('서비스 목록의 대상 서버 줄에 판정과 판정 시각이 실리고, 훑기 전 줄은 비어 있다', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/settings/services' });
    const 줄들 = res.json<{ items: { id: number; envs: { env: string; viewportKind: string | null; viewportJudgedAt: string | null }[] }[] }>()
      .items.find((s) => s.id === 번호)?.envs ?? [];
    expect(줄들.map((e) => [e.env, e.viewportKind, e.viewportJudgedAt === null ? null : new Date(e.viewportJudgedAt).toISOString()])).toEqual([
      ['live', null, null],
      ['qa', 'responsive', '2026-10-16T10:40:00.000Z'],
    ]);
  });

  it('화면별 차이는 그 대상 서버의 다른 화면만 주고, 같은 화면은 수만 주고, 모바일로 못 연 화면은 뺀다', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/settings/services/${String(번호)}/viewport?env=qa` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ items: [{ state: '로그아웃', url: '/goods', name: '상품 목록', viewport: 다름 }], differ: 1, same: 1 });
  });

  it('다른 화면은 200장까지만 주고 전체 수는 differ 로 알린다', async () => {
    await (await pool()).query(
      `INSERT INTO screen_found (service_id, env, state, url, name, viewport)
       SELECT $1, 'live', '로그아웃', '/goods/' || n, '', $2 FROM generate_series(1, 200) AS n`,
      [번호, JSON.stringify(다름)],
    );
    const res = await app.inject({ method: 'GET', url: `/api/settings/services/${String(번호)}/viewport?env=live` });
    const 몸 = res.json<{ items: unknown[]; differ: number; same: number }>();
    expect([몸.items.length, 몸.differ, 몸.same]).toEqual([200, 201, 0]);
  });

  it('대상 서버를 안 주면 400, 없는 대상 서버면 404 다', async () => {
    const 없음 = await app.inject({ method: 'GET', url: `/api/settings/services/${String(번호)}/viewport` });
    const 틀림 = await app.inject({ method: 'GET', url: `/api/settings/services/${String(번호)}/viewport?env=qaa` });
    expect([없음.statusCode, 틀림.statusCode]).toEqual([400, 404]);
  });

  it('대상 서버 주소를 바꾸면 판정과 함께 화면별 차이도 비운다 — 옛 서버 화면이 새 판정 옆에 안 섞이게', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/settings/services/${String(번호)}`,
      payload: { envs: [{ env: 'qa', baseUrl: 'https://qa2.xvp.test' }, { env: 'live', baseUrl: 'https://xvp.test' }] },
    });
    expect(res.statusCode).toBe(200);
    const r = await (await pool()).query<{ env: string; n: number }>(
      'SELECT env, count(*)::int AS n FROM screen_found WHERE service_id = $1 AND viewport IS NOT NULL GROUP BY env ORDER BY env',
      [번호],
    );
    expect(r.rows).toEqual([{ env: 'live', n: 201 }]);
  });
});
