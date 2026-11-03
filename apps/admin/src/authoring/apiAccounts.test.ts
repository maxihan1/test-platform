// API 애플리케이션 작성 집기 accounts · adminKey 검사 — 대조가 없는 API 작성도 그 대상 서버 줄의 계정 · 어드민 키를 받는다 (SPEC 도메인/작성 §3.6 「★ 역할별 계정」 · §7 claim)

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import authoringAgentRoutes from './agentRoutes.js';
import { 계정줄env } from './continue.js';
import authoringRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XAJ';
const 비밀 = 'xaj-비밀번호-원문-3c9';
const 플레이어비밀 = 'xaj-플레이어-비밀번호-8b1';

describe.skipIf(연결 === undefined)('API 애플리케이션 작성 집기 accounts · adminKey', () => {
  let app: FastifyInstance;
  let 서비스 = 0;
  const 부르는이 = `${접두사.toLowerCase()}-에이전트`;

  async function 하나만세운다(env: string, params: Record<string, unknown> = {}): Promise<void> {
    const { pool } = await import('../db/index.js');
    await pool.query(`UPDATE authoring_request SET status = 'FAILED' WHERE service_id = $1 AND status IN ('PENDING', 'RUNNING')`, [서비스]);
    await pool.query(
      `INSERT INTO authoring_request (service_id, kind, params, requested_by, requested_by_name, status, env)
       VALUES ($1, 'AUTHOR', $2, $3, 'API 검사', 'PENDING', $4)`,
      [서비스, JSON.stringify(params), 부르는이, env],
    );
  }

  const 집기 = async () =>
    (await app.inject({ method: 'POST', url: `/api/authoring/requests/claim?service=${접두사}` })).json<{ target?: unknown; accounts?: { env: string }[]; adminKey?: unknown }>();

  beforeAll(async () => {
    const { pool } = await import('../db/index.js');
    const r = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, kind) VALUES ($1, 'XAJ API 계정 검사용', '#3A5FCD', '', 'xaj', 'API') RETURNING id`,
      [접두사],
    );
    서비스 = Number(r.rows[0]!.id);

    process.env.AUTHORING_AGENT_USER = 부르는이;
    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = { username: 부르는이, displayName: 'API 계정 검사', role: 'member' as const, dashboard: 'read' as const, mustChangePassword: false, services: [] };
    });
    await app.register(authoringRoutes, { prefix: '/api' });
    await app.register(authoringAgentRoutes, { prefix: '/api' });
    await app.ready();
  });

  beforeEach(async () => {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM service_env WHERE service_id = $1', [서비스]);
    await pool.query(
      `INSERT INTO service_env (service_id, env, base_url, login_id, login_password, is_prod, role_accounts, admin_key) VALUES
       ($1, 'dev', 'http://dev.xaj.test', 'user1', $2, false, $3, jsonb_build_object('header', 'X-Admin-Key', 'value', 'dev-xaj-admin-key-raw')),
       ($1, 'qa', 'http://qa.xaj.test', 'user1', $2, false, $3, jsonb_build_object('header', 'X-Admin-Key', 'value', 'qa-xaj-admin-key-raw')),
       ($1, 'live', 'http://live.xaj.test', 'user1', $2, true, $3, jsonb_build_object('header', 'X-Admin-Key', 'value', 'live-xaj-admin-key-raw'))`,
      [서비스, 비밀, JSON.stringify([{ role: '플레이어', loginId: 'player1', loginPassword: 플레이어비밀 }])],
    );
  });

  afterAll(async () => {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service_env WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
    await app.close();
  });

  it('작성 행의 대상 서버 줄 계정만 일반 회원 · 역할 계정 차례로 싣는다 — 다른 줄은 안 싣는다', async () => {
    await 하나만세운다('qa');
    expect((await 집기()).accounts).toEqual([
      { env: 'qa', baseUrl: 'http://qa.xaj.test', role: '일반 회원', loginId: 'user1', loginPassword: 비밀 },
      { env: 'qa', baseUrl: 'http://qa.xaj.test', role: '플레이어', loginId: 'player1', loginPassword: 플레이어비밀 },
    ]);
  });

  it('그 줄의 어드민 키를 줄 이름 · 주소와 같이 싣는다 — 키가 없으면 키 자체가 없다', async () => {
    await 하나만세운다('qa');
    expect((await 집기()).adminKey).toEqual({ env: 'qa', baseUrl: 'http://qa.xaj.test', header: 'X-Admin-Key', value: 'qa-xaj-admin-key-raw' });
    const { pool } = await import('../db/index.js');
    await pool.query(`UPDATE service_env SET admin_key = NULL WHERE service_id = $1 AND env = 'qa'`, [서비스]);
    await 하나만세운다('qa');
    expect('adminKey' in (await 집기())).toBe(false);
  });

  it('만든 뒤 그 줄이 「실서비스 서버」로 바뀌면 계정 · 어드민 키를 안 싣는다', async () => {
    await 하나만세운다('live');
    const r = await 집기();
    expect('accounts' in r).toBe(false);
    expect('adminKey' in r).toBe(false);
  });

  it('이어 작성은 API 뿌리의 대상 서버 줄로 계정을 센다 — 실서비스 서버 줄이면 없다', async () => {
    expect(await 계정줄env(서비스, { 대조env: null, 뿌리env: 'qa' }, 'API')).toBe('qa');
    expect(await 계정줄env(서비스, { 대조env: null, 뿌리env: 'live' }, 'API')).toBe(null);
    expect(await 계정줄env(서비스, { 대조env: null, 뿌리env: 'qa' }, 'SCREEN')).toBe(null);
  });
});
