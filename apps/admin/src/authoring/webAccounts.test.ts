// 웹 애플리케이션 정방향 작성 집기 accounts 검사 — 대조가 없는 웹 작성도 일반 회원 계정이 있는 첫 줄의 계정을 받는다 (SPEC 도메인/작성 §3.6 「★ 역할별 계정」 · §7 claim)

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import authoringAgentRoutes from './agentRoutes.js';
import { 계정줄env } from './continue.js';
import authoringRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XAH';
const 비밀 = 'xah-비밀번호-원문-5d2';
const 관리자비밀 = 'xah-관리자-비밀번호-7e4';

describe.skipIf(연결 === undefined)('웹 애플리케이션 정방향 작성 집기 accounts', () => {
  let app: FastifyInstance;
  let 서비스 = 0;
  const 부르는이 = `${접두사.toLowerCase()}-에이전트`;

  async function 하나만세운다(params: Record<string, unknown> = {}): Promise<void> {
    const { pool } = await import('../db/index.js');
    await pool.query(`UPDATE authoring_request SET status = 'FAILED' WHERE service_id = $1 AND status IN ('PENDING', 'RUNNING')`, [서비스]);
    await pool.query(
      `INSERT INTO authoring_request (service_id, kind, params, requested_by, requested_by_name, status)
       VALUES ($1, 'AUTHOR', $2, $3, '웹 검사', 'PENDING')`,
      [서비스, JSON.stringify(params), 부르는이],
    );
  }

  const 집기 = async () =>
    (await app.inject({ method: 'POST', url: `/api/authoring/requests/claim?service=${접두사}` })).json<{ target?: unknown; accounts?: { env: string }[] }>();

  beforeAll(async () => {
    const { pool } = await import('../db/index.js');
    const r = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, kind) VALUES ($1, 'XAH 웹 계정 검사용', '#3A5FCD', '', 'xah', 'SCREEN') RETURNING id`,
      [접두사],
    );
    서비스 = Number(r.rows[0]!.id);

    process.env.AUTHORING_AGENT_USER = 부르는이;
    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = { username: 부르는이, displayName: '웹 계정 검사', role: 'member' as const, dashboard: 'read' as const, mustChangePassword: false, services: [] };
    });
    await app.register(authoringRoutes, { prefix: '/api' });
    await app.register(authoringAgentRoutes, { prefix: '/api' });
    await app.ready();
  });

  beforeEach(async () => {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM service_env WHERE service_id = $1', [서비스]);
    await pool.query(
      `INSERT INTO service_env (service_id, env, base_url, login_id, login_password, is_prod, role_accounts) VALUES
       ($1, 'a-empty', 'http://empty.xah.test', NULL, NULL, false, '[]'),
       ($1, 'a-live', 'http://live.xah.test', 'user1', $2, true, $3),
       ($1, 'qa', 'http://qa.xah.test', 'user1', $2, false, $3),
       ($1, 'stg', 'http://stg.xah.test', 'user1', $2, false, $3)`,
      [서비스, 비밀, JSON.stringify([{ role: '관리자', loginId: 'admin1', loginPassword: 관리자비밀 }])],
    );
  });

  afterAll(async () => {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service_env WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
    await app.close();
  });

  it('계정이 빈 줄 · 실서비스 서버 줄을 건너뛰고 일반 회원 계정이 있는 첫 줄의 계정만 차례로 싣는다 — target 은 없다', async () => {
    await 하나만세운다();
    const r = await 집기();
    expect('target' in r).toBe(false);
    expect(r.accounts).toEqual([
      { env: 'qa', baseUrl: 'http://qa.xah.test', role: '일반 회원', loginId: 'user1', loginPassword: 비밀 },
      { env: 'qa', baseUrl: 'http://qa.xah.test', role: '관리자', loginId: 'admin1', loginPassword: 관리자비밀 },
    ]);
  });

  it('계정이 있는 줄이 실서비스 서버 줄뿐이면 accounts 를 안 싣는다', async () => {
    const { pool } = await import('../db/index.js');
    await pool.query(`UPDATE service_env SET login_id = NULL WHERE service_id = $1 AND env IN ('qa', 'stg')`, [서비스]);
    await 하나만세운다();
    expect('accounts' in (await 집기())).toBe(false);
  });

  it('반영 행은 정방향 작성 줄 고르기 없이 운영 아닌 줄 전부를 그대로 싣는다', async () => {
    await 하나만세운다({ prdApply: true });
    expect((await 집기()).accounts?.map((x) => x.env)).toEqual(['qa', 'qa', 'stg', 'stg']);
  });

  it('이어 작성은 웹 정방향 뿌리면 계정 있는 첫 줄, 대조 뿌리면 그 줄로 계정을 센다', async () => {
    expect(await 계정줄env(서비스, { 대조env: null, 뿌리env: null }, 'SCREEN')).toBe('qa');
    expect(await 계정줄env(서비스, { 대조env: 'stg', 뿌리env: 'stg' }, 'SCREEN')).toBe('stg');
  });
});
