// PRD 초안 한 바퀴 — 배포가 세우는 초안 요청 · 사람 목록에서 빼기 · 집기 draft 칸 · 결과 통로 · 빈 끝내기 막기 · 에이전트가 꺼지면 다시 세우기 · 사람 다시 실행 막기 (도메인/BTS 「PRD 초안 → 결정 필요」 · §7). DATABASE_URL 이 있을 때만 돈다

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { 에이전트토큰만들기 } from '../auth/agentToken.js';
import { 인증등록 } from '../auth/gate.js';
import { 해시 } from '../auth/password.js';
import authRoutes from '../auth/routes.js';
import { 세션등록 } from '../auth/session.js';
import authoringAgentRoutes from '../authoring/agentRoutes.js';
import { 손남은뿌리들 } from '../authoring/decisionReads.js';
import { 한쪽 } from '../authoring/history.js';
import authoringRoutes from '../authoring/routes.js';

import { 초안세우기 } from './draft.js';
import btsDraftRoutes from './draftRoutes.js';

const 연결 = process.env.DATABASE_URL;
const 맥 = 'xpt-agent';
const 사람 = 'xpt-person';
const 계정들 = [맥, 사람];
const 접두사들 = ['XPT', 'XPT2', 'XPTB'];

type 집은몸 = { id: number; kind: string; env: string; draft?: { projectId: number; services: { prefix: string; kind: string }[]; issueKeys: string[]; buildNo: string }; target?: { env: string; baseUrl: string }; mcpKey?: string };

describe.skipIf(연결 === undefined)('PRD 초안 한 바퀴', () => {
  let app: FastifyInstance;
  let 프로젝트 = 0;
  const 앱: Record<string, number> = {};
  let 배포 = 0;
  let 토큰 = '';
  let 사람쿠키 = '';
  const q = async (sql: string, 값: unknown[] = []) => (await import('../db/index.js')).pool.query(sql, 값);

  async function 치우기() {
    const 앱들 = (await q('SELECT id FROM service WHERE prefix = ANY($1)', [접두사들])).rows.map((r: { id: string }) => Number(r.id));
    await q('DELETE FROM authoring_request WHERE service_id = ANY($1)', [앱들]);
    await q('DELETE FROM test_run WHERE service_id = ANY($1)', [앱들]);
    await q('DELETE FROM prd_version WHERE service_id = ANY($1)', [앱들]);
    await q('DELETE FROM service_env WHERE service_id = ANY($1)', [앱들]);
    await q('DELETE FROM user_project WHERE username = ANY($1)', [계정들]);
    await q('DELETE FROM app_user WHERE username = ANY($1)', [계정들]);
    // 프로젝트는 애플리케이션이 다 지워지면 트리거가 지운다 — bts_link · bts_deploy 가 같이 간다
    await q('DELETE FROM service WHERE id = ANY($1)', [앱들]);
  }

  const 부르기 = (method: 'GET' | 'POST', url: string, payload?: object) =>
    app.inject({ method, url, headers: { authorization: `Bearer ${토큰}` }, ...(payload !== undefined && { payload }) });
  const 집기 = async (prefix: string) => {
    const res = await 부르기('POST', `/api/authoring/requests/claim?service=${prefix}`);
    return res.statusCode === 204 ? null : res.json<집은몸>();
  };
  const 초안보내기 = (id: number, 몸: object) => 부르기('POST', `/api/authoring/requests/${String(id)}/draft`, 몸);
  const 끝내기 = (id: number, prefix: string, 몸: object) => 부르기('POST', `/api/authoring/requests/${String(id)}/finish?service=${prefix}`, 몸);
  const 줄 = async (id: number) =>
    (await q('SELECT kind, status, env, compare, params, result, requested_by, requested_by_name FROM authoring_request WHERE id = $1', [id])).rows[0] as {
      kind: string; status: string; env: string; compare: boolean; params: Record<string, unknown>; result: Record<string, unknown> | null; requested_by: string; requested_by_name: string;
    };

  beforeAll(async () => {
    vi.stubEnv('AUTHORING_AGENT_USER', 맥);
    await 치우기();
    프로젝트 = Number((await q(`INSERT INTO project (name) VALUES ('XPT 프로젝트') RETURNING id`)).rows[0].id);
    const 남프로젝트 = Number((await q(`INSERT INTO project (name) VALUES ('XPT 다른 프로젝트') RETURNING id`)).rows[0].id);
    for (const [prefix, p] of [['XPT', 프로젝트], ['XPT2', 프로젝트], ['XPTB', 남프로젝트]] as const) {
      앱[prefix] = Number((await q(
        `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id) VALUES ($1, $1, '#123456', 'https://github.com/x/xpt', $2, $3) RETURNING id`,
        [prefix, prefix.toLowerCase(), p],
      )).rows[0].id);
      await q(`INSERT INTO service_env (service_id, env, base_url) VALUES ($1, 'qa', $2)`, [앱[prefix], `https://qa.${prefix.toLowerCase()}.test`]);
    }
    await q(
      `INSERT INTO prd_version (service_id, version, items, last_no, source, saved_by, saved_by_name) VALUES ($1, 1, $2, 1, 'PERSON', 'xpt', 'xpt')`,
      [앱.XPT, JSON.stringify([{ reqId: 'XPT-FN-001', feature: '쿠폰', text: '최소 주문 금액은 1만 원이다', basis: [], status: 'CONFIRMED' }])],
    );
    for (const 이름 of 계정들) {
      await q(
        `INSERT INTO app_user (username, display_name, password_hash, role, perm_dashboard, is_approved, must_change_password) VALUES ($1, $2, $3, 'member', 'none', true, false)`,
        [이름, 이름 === 사람 ? '배포 담당' : 이름, await 해시('열려라참깨')],
      );
    }
    await q(`INSERT INTO user_project (username, project_id, perm_cases, perm_runs, perm_authoring) VALUES ($1, $2, 'none', 'none', 'write'), ($3, $2, 'write', 'write', 'write')`, [맥, 프로젝트, 사람]);
    await q(
      `INSERT INTO bts_link (project_id, base_url, bts_project, bot_key, webhook_secret, status_map, resolution_map, updated_by) VALUES ($1, 'https://bts.xpt.test', 'XPQ', 'k', 's', '{}', '{}', $2)`,
      [프로젝트, 사람],
    );
    // 배포가 웹 둘에 실행을 걸었다 — 초안의 대상 서버는 그 실행의 서버다
    const 실행 = async (prefix: string) =>
      Number((await q(
        `INSERT INTO test_run (title, triggered_by, status, env, service_id, service_name, tests_repo, base_url) VALUES ($1, 'xpt', 'FINISHED', 'qa', $2, $1, '', 'https://qa.xpt.test') RETURNING run_id`,
        [prefix, 앱[prefix]],
      )).rows[0].run_id);
    const 실행들 = [await 실행('XPT'), await 실행('XPT2')];
    배포 = Number((await q(
      `INSERT INTO bts_deploy (project_id, build_no, service_ids, run_ids, state) VALUES ($1, 'abc1234-202610311200', $2, $3, 'CLAIMED') RETURNING id`,
      [프로젝트, [앱.XPT, 앱.XPT2], 실행들],
    )).rows[0].id);
    토큰 = (await 에이전트토큰만들기(맥) as { 토큰: string }).토큰;

    app = Fastify();
    세션등록(app, 'xpt-검사용-세션-열쇠-32글자를-넘긴다-넉넉히');
    인증등록(app);
    await app.register(authRoutes, { prefix: '/api' });
    await app.register(authoringRoutes, { prefix: '/api' });
    await app.register(authoringAgentRoutes, { prefix: '/api' });
    await app.register(btsDraftRoutes, { prefix: '/api' });
    await app.ready();
    const 로그인 = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 사람, password: '열려라참깨' } });
    사람쿠키 = (로그인.headers['set-cookie'] as string).split(';')[0]!;
  });

  afterAll(async () => {
    await app?.close();
    await 치우기();
    vi.unstubAllEnvs();
  });

  it('배포의 애플리케이션마다 초안 요청이 하나씩 서고, 대상 서버는 배포가 건 실행의 서버다', async () => {
    expect(await 초안세우기(배포, [])).toEqual([]);
    const 번호들 = await 초안세우기(배포, ['XPQ-1', 'XPQ-2']);
    expect(번호들).toHaveLength(2);
    const 첫 = await 줄(번호들[0]!);
    expect(첫).toMatchObject({
      kind: 'PRD_DRAFT', status: 'PENDING', env: 'qa', compare: false, result: null,
      params: { issueKeys: ['XPQ-1', 'XPQ-2'], deployId: 배포, buildNo: 'abc1234-202610311200' },
      requested_by: 사람, requested_by_name: 'BTS · 배포 담당',
    });
  });

  it('사람 작성 목록 · 결정 목록에는 안 싣고, 에이전트의 멈춘 줄 닫기 목록에는 싣는다', async () => {
    expect((await 한쪽({ 서비스: 앱.XPT!, 쪽: 1 })).items).toHaveLength(0);
    expect((await 한쪽({ 서비스: 앱.XPT!, 쪽: 1, 노트도: true })).items.map((x) => x.kind)).toEqual(['PRD_DRAFT']);
    expect(await 손남은뿌리들(앱.XPT!)).toEqual([]);
  });

  it('집기는 draft 칸 · 대상 서버 · MCP 열쇠를 싣는다', async () => {
    const 집은 = (await 집기('XPT'))!;
    expect(집은).toMatchObject({ kind: 'PRD_DRAFT', env: 'qa', draft: { projectId: 프로젝트, issueKeys: ['XPQ-1', 'XPQ-2'], buildNo: 'abc1234-202610311200' } });
    expect(집은.draft!.services.map((s) => s.prefix)).toEqual(['XPT', 'XPT2']);
    expect(집은.target).toMatchObject({ env: 'qa', baseUrl: 'https://qa.xpt.test' });
    expect(집은.mcpKey).toMatch(/^mcj_/);
  });

  it('초안 없이 끝내면 400 BAD_DRAFT, 틀린 초안은 400 이고 맞는 초안은 result.draft 에 지금 판 번호와 같이 남는다', async () => {
    const id = Number((await q(`SELECT id FROM authoring_request WHERE service_id = $1 AND status = 'RUNNING'`, [앱.XPT])).rows[0].id);
    expect((await 끝내기(id, 'XPT', { status: 'DONE' })).json()).toEqual({ error: 'BAD_DRAFT', detail: 'draft' });
    const 틀림 = await 초안보내기(id, { rows: [{ op: 'EDIT', reqId: 'XPT-FN-999', text: '2만 원', basis: 'XPQ-1', issueKeys: ['XPQ-1'], sure: true }] });
    expect(틀림.statusCode).toBe(400);
    expect(틀림.json()).toEqual({ error: 'BAD_DRAFT', detail: 'rows.0.reqId' });
    const 초안 = { rows: [{ op: 'EDIT', reqId: 'XPT-FN-001', text: '최소 주문 금액은 2만 원이다', basis: 'XPQ-1 본문', issueKeys: ['XPQ-1'], sure: true }] };
    const 받음 = await 초안보내기(id, 초안);
    expect(받음.statusCode).toBe(201);
    expect(받음.json()).toEqual({ rows: 1 });
    expect((await 끝내기(id, 'XPT', { status: 'DONE' })).statusCode).toBe(200);
    expect(await 줄(id)).toMatchObject({ status: 'DONE', result: { draft: 초안, prdVersion: 1 } });
    // 끝난 줄에는 초안을 더 못 붙인다
    expect((await 초안보내기(id, 초안)).statusCode).toBe(409);
  });

  it('사람은 초안 줄을 다시 돌리지 못한다', async () => {
    const id = Number((await q(`SELECT id FROM authoring_request WHERE service_id = $1 AND status = 'DONE'`, [앱.XPT])).rows[0].id);
    const res = await app.inject({ method: 'POST', url: '/api/authoring/requests?service=XPT', headers: { cookie: 사람쿠키 }, payload: { kind: 'RERUN', sourceId: id } });
    expect(res.json()).toEqual({ error: 'BAD_KIND', detail: 'PRD_DRAFT' });
  });

  it('에이전트가 꺼져 멈춘 초안은 같은 칸으로 새로 선다', async () => {
    const 집은 = (await 집기('XPT2'))!;
    expect((await 끝내기(집은.id, 'XPT2', { status: 'STOPPED', stopReason: 'AGENT_RESTART' })).statusCode).toBe(200);
    const 새 = (await q(`SELECT id FROM authoring_request WHERE service_id = $1 AND status = 'PENDING'`, [앱.XPT2])).rows as { id: string }[];
    expect(새).toHaveLength(1);
    expect(await 줄(Number(새[0]!.id))).toMatchObject({ kind: 'PRD_DRAFT', env: 'qa', params: { issueKeys: ['XPQ-1', 'XPQ-2'], deployId: 배포 } });
  });

  it('초안 아닌 줄은 초안 통로를 못 쓴다', async () => {
    const id = Number((await q(
      `INSERT INTO authoring_request (service_id, kind, params, requested_by, requested_by_name, status, claimed_by) VALUES ($1, 'AUTHOR', '{}', $2, $2, 'RUNNING', $3) RETURNING id`,
      [앱.XPT, 사람, 맥],
    )).rows[0].id);
    expect((await 초안보내기(id, { rows: [] })).json()).toEqual({ error: 'BAD_KIND', detail: 'AUTHOR' });
  });

  it('대상 서버 없는 초안 줄 · 시작 주소가 있는 초안 줄은 DB 가 막는다', async () => {
    await expect(q(`INSERT INTO authoring_request (service_id, kind, params, requested_by, requested_by_name, status) VALUES ($1, 'PRD_DRAFT', '{}', 'x', 'x', 'PENDING')`, [앱.XPTB])).rejects.toThrow(/draft_env_check/);
    await expect(q(`INSERT INTO authoring_request (service_id, kind, params, requested_by, requested_by_name, status, env, compare, start_url) VALUES ($1, 'PRD_DRAFT', '{}', 'x', 'x', 'PENDING', 'qa', true, '/a')`, [앱.XPTB])).rejects.toThrow(/check/);
  });
});
