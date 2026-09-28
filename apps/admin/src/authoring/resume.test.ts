// 작성 이어하기 통로 검사 — 이어서 작성 · canResume · resumedBy · 집기는 원본을 집었던 에이전트만 (SPEC 도메인/작성 §7 「이어하기」)

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import authoringAgentRoutes from './agentRoutes.js';
import assetRoutes from './assets.js';
import authoringRoutes from './routes.js';
import { 한건 } from './store.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XWM';

describe.skipIf(연결 === undefined)('작성 이어하기', () => {
  let app: FastifyInstance;
  let 서비스 = 0;
  const 에이전트 = `${접두사.toLowerCase()}-에이전트`;

  const 이어서 = (sourceId: number) =>
    app.inject({
      method: 'POST',
      url: `/api/authoring/requests?service=${접두사}`,
      payload: { kind: 'RERUN', sourceId, resume: true },
    });
  const 상세 = async (id: number) =>
    (await app.inject({ method: 'GET', url: `/api/authoring/requests/${id}?service=${접두사}` })).json<
      Record<string, unknown>
    >();

  /** 멈춘 요청을 곧장 만든다. 기본은 이 에이전트가 집었다가 1시간 전에 시간초과로 멈춘 작성 요청 */
  async function 멈춘것(칸: {
    kind?: string;
    sourceId?: number;
    resumeFrom?: number;
    status?: string;
    끝난지?: string;
    집은이?: string | null;
    폐기?: boolean;
    compare?: boolean;
  } = {}): Promise<number> {
    const { pool } = await import('../db/index.js');
    const 상태 = 칸.status ?? 'STOPPED';
    const 멈춤 = 상태 === 'STOPPED';
    const r = await pool.query<{ id: string }>(
      `INSERT INTO authoring_request
         (service_id, kind, source_id, resume_from, requested_by, requested_by_name, status, claimed_by,
          stop_reason, stopped_by, finished_at, discarded_at, compare, env)
       VALUES ($1, $2, $3, $4, 'xwm', '이어하기 검사', $5, $6, $7, $8, now() - $9::interval,
               CASE WHEN $10 THEN now() END, $11, CASE WHEN $11 THEN 'qa' END)
       RETURNING id`,
      [
        서비스,
        칸.kind ?? 'AUTHOR',
        칸.sourceId ?? null,
        칸.resumeFrom ?? null,
        상태,
        칸.집은이 === undefined ? 에이전트 : 칸.집은이,
        멈춤 ? 'TIMEOUT' : null,
        멈춤 ? 'system' : null,
        칸.끝난지 ?? '1 hour',
        칸.폐기 === true,
        칸.compare === true,
      ],
    );
    return Number(r.rows[0]!.id);
  }

  beforeAll(async () => {
    const { pool } = await import('../db/index.js');
    const r = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, $2, '#3A5FCD', 'https://github.com/acme/xwm', 'xwm')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
      [접두사, `${접두사} 이어하기 검사용`],
    );
    서비스 = Number(r.rows[0]!.id);
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service_env WHERE service_id = $1', [서비스]);
    await pool.query(
      `INSERT INTO service_env (service_id, env, base_url, login_id, login_password)
       VALUES ($1, 'qa', 'https://qa.xwm.test', 'tester', 'xwm-비밀-7731')`,
      [서비스],
    );

    process.env.AUTHORING_AGENT_USER = 에이전트;
    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = { username: 에이전트, displayName: '이어하기 검사', role: 'member' as const, dashboard: 'read' as const, mustChangePassword: false, services: [] };
    });
    await app.register(authoringRoutes, { prefix: '/api' });
    await app.register(assetRoutes, { prefix: '/api' });
    await app.register(authoringAgentRoutes, { prefix: '/api' });
    await app.ready();
  });

  afterAll(async () => {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service_env WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
    await app.close();
  });

  it('중단된 작성 요청을 이어받으면 재실행 줄이 서고 원본과 이어받은 요청을 가리킨다', async () => {
    const 원본 = await 멈춘것();
    const res = await 이어서(원본);
    expect(res.statusCode).toBe(201);
    expect(await 한건(res.json<{ id: number }>().id)).toMatchObject({
      kind: 'RERUN',
      status: 'PENDING',
      sourceId: 원본,
      resumeFrom: 원본,
    });
  });

  it('이어받은 재실행이 또 멈추면 그것도 이어받는다 — 자료는 맨 처음 요청 것', async () => {
    const 처음 = await 멈춘것();
    const 둘째 = await 멈춘것({ kind: 'RERUN', sourceId: 처음, resumeFrom: 처음 });
    const res = await 이어서(둘째);
    expect(res.statusCode).toBe(201);
    expect(await 한건(res.json<{ id: number }>().id)).toMatchObject({ sourceId: 처음, resumeFrom: 둘째 });
  });

  it('대조 요청을 이어받으면 대상 서버를 물려받는다', async () => {
    const 원본 = await 멈춘것({ compare: true });
    const res = await 이어서(원본);
    expect(res.statusCode).toBe(201);
    expect(await 한건(res.json<{ id: number }>().id)).toMatchObject({ compare: true, env: 'qa' });
  });

  it('이미 이어받은 것 · 폐기한 것 · 7일 지난 것 · 끝나거나 실패한 것은 409 NOT_RESUMABLE', async () => {
    const 한번 = await 멈춘것();
    expect((await 이어서(한번)).statusCode).toBe(201);
    const 막힐것 = [
      한번,
      await 멈춘것({ 폐기: true }),
      await 멈춘것({ 끝난지: '8 days' }),
      await 멈춘것({ status: 'DONE' }),
      await 멈춘것({ status: 'FAILED' }),
    ];
    for (const id of 막힐것) {
      const res = await 이어서(id);
      expect(res.statusCode, `원본 ${id}`).toBe(409);
      expect(res.json()).toMatchObject({ error: 'NOT_RESUMABLE' });
    }
  });

  it('상세는 이어받을 수 있는지와 누가 이어받았는지를 준다', async () => {
    const 원본 = await 멈춘것();
    const 처음 = await 상세(원본);
    expect(처음).toMatchObject({ canResume: true, resumedBy: null });
    // 멈춘 지 1시간 — 이어갈 수 있는 마지막 시각은 끝난 때에서 7일 뒤다
    const 남은ms = Date.parse(String(처음.resumeUntil)) - Date.now();
    expect(남은ms).toBeGreaterThan(6 * 86_400_000);
    expect(남은ms).toBeLessThan(7 * 86_400_000);
    const 새것 = (await 이어서(원본)).json<{ id: number }>().id;
    expect(await 상세(원본)).toMatchObject({ canResume: false, resumedBy: 새것, resumeUntil: null });
    expect(await 상세(새것)).toMatchObject({ resumeFrom: 원본, canResume: false });
  });

  it('상세의 keepWorkspace 는 에이전트가 폴더를 남길지다 — 이어받은 줄이 아직 안 돌았어도 남긴다', async () => {
    const 원본 = await 멈춘것();
    await 이어서(원본);
    expect(await 상세(원본)).toMatchObject({ keepWorkspace: true, canResume: false });
    expect(await 상세(await 멈춘것({ 끝난지: '8 days' }))).toMatchObject({ keepWorkspace: false });
    expect(await 상세(await 멈춘것({ 폐기: true }))).toMatchObject({ keepWorkspace: false });
    expect(await 상세(await 멈춘것({ status: 'DONE' }))).toMatchObject({ keepWorkspace: false });
  });

  describe('집기', () => {
    const 집기 = () => app.inject({ method: 'POST', url: `/api/authoring/requests/claim?service=${접두사}` });

    it('다른 에이전트가 집었던 요청의 이어받기는 건너뛴다 — 보관 폴더는 그 기계에 있다', async () => {
      const { pool } = await import('../db/index.js');
      await pool.query(`UPDATE authoring_request SET status = 'DONE' WHERE service_id = $1 AND status = 'PENDING'`, [서비스]);
      const 남의것 = await 멈춘것({ 집은이: '다른-에이전트' });
      await 이어서(남의것);
      expect((await 집기()).statusCode).toBe(204);

      const 내것 = await 멈춘것();
      const 새것 = (await 이어서(내것)).json<{ id: number }>().id;
      const 집음 = await 집기();
      expect(집음.statusCode).toBe(200);
      expect(집음.json()).toMatchObject({ id: 새것, resumeFrom: 내것 });
    });

    it('아무도 집지 않은 채 멈춘 요청의 이어받기는 누구나 집는다', async () => {
      const { pool } = await import('../db/index.js');
      await pool.query(`UPDATE authoring_request SET status = 'DONE' WHERE service_id = $1 AND status = 'PENDING'`, [서비스]);
      const 안집힘 = await 멈춘것({ 집은이: null });
      const 새것 = (await 이어서(안집힘)).json<{ id: number }>().id;
      expect((await 집기()).json()).toMatchObject({ id: 새것 });
    });
  });
});
