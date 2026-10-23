// Android 앱 · 게임 작성 집기 accounts · adminKey 검사 — 대조가 없는 앱도 앱 줄 계정을, 게임은 앱 줄 어드민 키를 받는다 (SPEC 도메인/작성 §3.6 「★ 역할별 계정」 · §7 claim)

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import authoringAgentRoutes from './agentRoutes.js';
import authoringRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XAC';
const 비밀 = 'xac-비밀번호-원문-7d2';
const 잠긴비밀 = 'xac-잠긴-비밀번호-5e8';

describe.skipIf(연결 === undefined)('Android 앱 작성 집기 accounts', () => {
  let app: FastifyInstance;
  let 서비스 = 0;
  const 부르는이 = `${접두사.toLowerCase()}-에이전트`;

  async function 줄들(값: string): Promise<void> {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM service_env WHERE service_id = $1', [서비스]);
    await pool.query(`INSERT INTO service_env (service_id, env, base_url, login_id, login_password, is_prod, app_path, role_accounts) VALUES ${값}`, [
      서비스,
      비밀,
      JSON.stringify([{ role: '잠긴 회원', loginId: 'locked', loginPassword: 잠긴비밀 }]),
    ]);
  }

  async function 하나만세운다(params: Record<string, unknown> = {}, env: string | null = null): Promise<void> {
    const { pool } = await import('../db/index.js');
    await pool.query(`UPDATE authoring_request SET status = 'FAILED' WHERE service_id = $1 AND status IN ('PENDING', 'RUNNING')`, [서비스]);
    await pool.query(
      `INSERT INTO authoring_request (service_id, kind, params, requested_by, requested_by_name, status, env)
       VALUES ($1, 'AUTHOR', $2, $3, '앱 검사', 'PENDING', $4)`,
      [서비스, JSON.stringify(params), 부르는이, env],
    );
  }

  const 집기 = async () =>
    (await app.inject({ method: 'POST', url: `/api/authoring/requests/claim?service=${접두사}` })).json<{ target?: unknown; accounts?: unknown; adminKey?: unknown }>();

  beforeAll(async () => {
    const { pool } = await import('../db/index.js');
    const r = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, kind) VALUES ($1, 'XAC 앱 계정 검사용', '#3A5FCD', '', 'xac', 'APP') RETURNING id`,
      [접두사],
    );
    서비스 = Number(r.rows[0]!.id);

    process.env.AUTHORING_AGENT_USER = 부르는이;
    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = { username: 부르는이, displayName: '앱 계정 검사', role: 'member' as const, dashboard: 'read' as const, mustChangePassword: false, services: [] };
    });
    await app.register(authoringRoutes, { prefix: '/api' });
    await app.register(authoringAgentRoutes, { prefix: '/api' });
    await app.ready();
  });

  beforeEach(async () => {
    await 줄들(
      `($1, 'dev', 'http://dev.xac.test', 'user1', $2, false, NULL, $3),
       ($1, 'live', 'http://live.xac.test', 'user1', $2, true, '/apk/live.apk', $3),
       ($1, 'qa', 'http://qa.xac.test', 'user1', $2, false, '/apk/qa.apk', $3)`,
    );
  });

  afterAll(async () => {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service_env WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
    await app.close();
  });

  it('정방향 작성이면 앱 파일 경로가 있는 첫 줄(실서비스 서버 줄은 건너뛴다)의 일반 회원 다음 역할 계정이 실리고 target 은 없다', async () => {
    await 하나만세운다();
    const r = await 집기();
    expect('target' in r).toBe(false);
    expect(r.accounts).toEqual([
      { env: 'qa', baseUrl: 'http://qa.xac.test', role: '일반 회원', loginId: 'user1', loginPassword: 비밀 },
      { env: 'qa', baseUrl: 'http://qa.xac.test', role: '잠긴 회원', loginId: 'locked', loginPassword: 잠긴비밀 },
    ]);
  });

  it('게임 애플리케이션도 앱 파일 경로가 있는 줄의 계정을 받는다', async () => {
    const { pool } = await import('../db/index.js');
    await pool.query(`UPDATE service SET kind = 'GAME' WHERE id = $1`, [서비스]);
    try {
      await 하나만세운다();
      expect(((await 집기()).accounts as { env: string }[]).map((a) => a.env)).toEqual(['qa', 'qa']);
    } finally {
      await pool.query(`UPDATE service SET kind = 'APP' WHERE id = $1`, [서비스]);
    }
  });

  it('게임 애플리케이션은 앱 줄의 어드민 키를 그 줄 이름 · 주소와 같이 받는다 — 다른 줄 · 실서비스 서버 줄 키는 안 싣는다', async () => {
    const { pool } = await import('../db/index.js');
    await pool.query(`UPDATE service SET kind = 'GAME' WHERE id = $1`, [서비스]);
    await pool.query(`UPDATE service_env SET admin_key = jsonb_build_object('header', 'X-Admin-Key', 'value', env || '-xac-어드민-키-원문') WHERE service_id = $1`, [서비스]);
    try {
      await 하나만세운다();
      expect((await 집기()).adminKey).toEqual({ env: 'qa', baseUrl: 'http://qa.xac.test', header: 'X-Admin-Key', value: 'qa-xac-어드민-키-원문' });
      await pool.query(`UPDATE service_env SET admin_key = NULL WHERE service_id = $1 AND env = 'qa'`, [서비스]);
      await 하나만세운다();
      expect('adminKey' in (await 집기())).toBe(false);
    } finally {
      await pool.query(`UPDATE service SET kind = 'APP' WHERE id = $1`, [서비스]);
    }
  });

  it('Android 앱은 어드민 키가 있어도 싣지 않는다', async () => {
    const { pool } = await import('../db/index.js');
    await pool.query(`UPDATE service_env SET admin_key = jsonb_build_object('header', 'X-Admin-Key', 'value', 'xac-앱-어드민-키-원문') WHERE service_id = $1`, [서비스]);
    await 하나만세운다();
    expect('adminKey' in (await 집기())).toBe(false);
  });

  it('앱 파일 경로가 있는 줄이 실서비스 서버뿐이면 accounts 가 없다', async () => {
    await 줄들(`($1, 'live', 'http://live.xac.test', 'user1', $2, true, '/apk/live.apk', $3)`);
    await 하나만세운다();
    expect('accounts' in (await 집기())).toBe(false);
  });

  it('반영 행(prdApply)은 실서비스 서버가 아닌 줄 전부를 한 번씩 싣되 앱 줄을 맨 앞에 둔다 — 자식은 첫 일반 회원으로 로그인한다', async () => {
    await 하나만세운다({ prdApply: true });
    expect(((await 집기()).accounts as { env: string }[]).map((a) => a.env)).toEqual(['qa', 'qa', 'dev', 'dev']);
  });

  it('요청에 대상 서버가 있으면 앱 파일 경로가 없어도 그 줄이 앱 줄이다', async () => {
    await 하나만세운다({}, 'dev');
    expect(((await 집기()).accounts as { env: string }[]).map((a) => a.env)).toEqual(['dev', 'dev']);
  });
});
