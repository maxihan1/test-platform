// 수정 AI 한 바퀴 — 담당자 신호로 맡기 · 집기 bugfix 칸 · 결과 통로 · BTS 로 보낼 줄 · 빈 끝내기 막기 · 재검증 또 실패 넘기기 · 다시 안 맡기 (도메인/BTS 「수정 AI」 · §7). DATABASE_URL 이 있을 때만 돈다

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { 에이전트토큰만들기 } from '../auth/agentToken.js';
import { 인증등록 } from '../auth/gate.js';
import { 해시 } from '../auth/password.js';
import authRoutes from '../auth/routes.js';
import { 세션등록 } from '../auth/session.js';
import authoringAgentRoutes from '../authoring/agentRoutes.js';
import authoringRoutes from '../authoring/routes.js';

import { 수정맡기, 재검증실패넘기기 } from './bugfix.js';
import btsBugfixRoutes from './bugfixRoutes.js';
import type { 부르기함수 } from './client.js';

const 연결 = process.env.DATABASE_URL;
const 맥 = 'xbg-agent';
const 사람 = 'xbg-person';
const 계정들 = [맥, 사람];
const 접두사들 = ['XBG', 'XBG2'];
const 봇 = 'bot-uuid';
const 개발자 = 'dev-uuid';
const 리드 = 'lead-uuid';

interface 가짜이슈 {
  state: string;
  assigneeId: string | null;
  componentIds: string[];
}

describe.skipIf(연결 === undefined)('수정 AI 한 바퀴', () => {
  let app: FastifyInstance;
  let 프로젝트 = 0;
  const 앱: Record<string, number> = {};
  let 토큰 = '';
  let 사람쿠키 = '';
  const 이슈들: Record<string, 가짜이슈> = {};
  const q = async (sql: string, 값: unknown[] = []) => (await import('../db/index.js')).pool.query(sql, 값);

  const 가짜BTS: 부르기함수 = async (_자리, method, 경로) => {
    if (경로 === '/api/v1/users/me/whoami') return { status: 200, json: { userId: 봇 } };
    if (경로.startsWith('/api/v1/users?query=')) {
      const 낱말 = decodeURIComponent(경로.split('=')[1]!);
      return { status: 200, json: 낱말 === '김개발' ? [{ id: 개발자, email: 'Dev@Demo.test' }, { id: 'other', email: 'x@demo.test' }] : [] };
    }
    if (경로 === '/api/v1/projects/XBQ/components') return { status: 200, json: { data: [{ id: 'c1', name: 'XBG2', leadUserId: null }, { id: 'c2', name: '결제', leadUserId: 리드 }] } };
    if (경로 === '/api/v1/projects/XBQ/lead') return { status: 200, json: { data: { leadUserId: 리드 } } };
    const 꼴 = /^\/api\/v1\/issues\/([^/]+)(\/comments)?$/.exec(경로);
    const 이슈 = 꼴 === null ? undefined : 이슈들[decodeURIComponent(꼴[1]!)];
    if (method === 'GET' && 꼴 !== null && 이슈 !== undefined) {
      return 꼴[2] === undefined
        ? { status: 200, json: { data: { key: 꼴[1], currentStateKey: 이슈.state, assigneeId: 이슈.assigneeId, typeKey: 'bug', summary: '쿠폰 할인율이 틀림', description: '10% 가 1% 로 보임', componentIds: 이슈.componentIds } } }
        : { status: 200, json: { data: [{ body: '재현됨' }] } };
    }
    return { status: 404, json: null };
  };

  async function 치우기() {
    const 앱들 = (await q('SELECT id FROM service WHERE prefix = ANY($1)', [접두사들])).rows.map((r: { id: string }) => Number(r.id));
    await q('DELETE FROM authoring_request WHERE service_id = ANY($1)', [앱들]);
    await q(`DELETE FROM authoring_request WHERE project_id IN (SELECT id FROM project WHERE name = 'XBG 프로젝트')`);
    await q('DELETE FROM user_project WHERE username = ANY($1)', [계정들]);
    await q('DELETE FROM app_user WHERE username = ANY($1)', [계정들]);
    // 프로젝트는 애플리케이션이 다 지워지면 트리거가 지운다 — bts_link · bts_deploy · bts_claim · bts_outbox · bts_issue_case 가 같이 간다
    await q('DELETE FROM service WHERE id = ANY($1)', [앱들]);
  }

  const 부르기 = (method: 'GET' | 'POST', url: string, payload?: object) =>
    app.inject({ method, url, headers: { authorization: `Bearer ${토큰}` }, ...(payload !== undefined && { payload }) });
  const 집기 = async (prefix: string) => {
    const res = await 부르기('POST', `/api/authoring/requests/claim?service=${prefix}`);
    return res.statusCode === 204 ? null : res.json<{ id: number; kind: string; bugfix?: { issueKey: string; title: string; note: string; repo: { url: string } | null }; mcpKey?: string }>();
  };
  const 결과 = (id: number, 몸: object) => 부르기('POST', `/api/authoring/requests/${String(id)}/bugfix`, 몸);
  const 끝내기 = (id: number, prefix: string, 몸: object) => 부르기('POST', `/api/authoring/requests/${String(id)}/finish?service=${prefix}`, 몸);
  const 보낸줄 = async (key: string) =>
    (await q('SELECT kind, payload FROM bts_outbox WHERE issue_key = $1 ORDER BY id', [key])).rows as { kind: string; payload: Record<string, unknown> }[];
  const 수정줄 = async (key: string) =>
    (await q("SELECT id, status, pr_url, params, result, requested_by_name FROM authoring_request WHERE kind = 'BUGFIX' AND params->>'issueKey' = $1 ORDER BY id", [key])).rows as {
      id: string; status: string; pr_url: string | null; params: Record<string, unknown>; result: Record<string, unknown> | null; requested_by_name: string;
    }[];

  beforeAll(async () => {
    vi.stubEnv('AUTHORING_AGENT_USER', 맥);
    await 치우기();
    프로젝트 = Number((await q(`INSERT INTO project (name) VALUES ('XBG 프로젝트') RETURNING id`)).rows[0].id);
    for (const [prefix, 저장소] of [['XBG', [{ name: '서버', url: 'https://github.com/demo/shop' }, { name: '화면', url: 'https://github.com/demo/web' }]], ['XBG2', []]] as const) {
      앱[prefix] = Number((await q(
        `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id, code_repos) VALUES ($1, $1, '#123456', 'https://github.com/x/xbg', $2, $3, $4) RETURNING id`,
        [prefix, prefix.toLowerCase(), 프로젝트, JSON.stringify(저장소)],
      )).rows[0].id);
    }
    for (const 이름 of 계정들) {
      await q(
        `INSERT INTO app_user (username, display_name, password_hash, role, perm_dashboard, is_approved, must_change_password) VALUES ($1, $2, $3, 'member', 'none', true, false)`,
        [이름, 이름 === 사람 ? '연결 담당' : 이름, await 해시('열려라참깨')],
      );
    }
    await q(`INSERT INTO user_project (username, project_id, perm_cases, perm_runs, perm_authoring) VALUES ($1, $2, 'none', 'none', 'write'), ($3, $2, 'write', 'write', 'write')`, [맥, 프로젝트, 사람]);
    await q(
      `INSERT INTO bts_link (project_id, base_url, bts_project, bot_key, webhook_secret, status_map, resolution_map, updated_by)
       VALUES ($1, 'https://bts.xbg.test', 'XBQ', 'k', 's', $2, '{}', $3)`,
      [프로젝트, JSON.stringify({ DEV_REQUEST: 'dev', CODE_REVIEW: 'review', QA_REQUEST: 'qa' }), 사람],
    );
    토큰 = (await 에이전트토큰만들기(맥) as { 토큰: string }).토큰;

    app = Fastify();
    세션등록(app, 'xbg-검사용-세션-열쇠-32글자를-넘긴다-넉넉히');
    인증등록(app);
    await app.register(authRoutes, { prefix: '/api' });
    await app.register(authoringRoutes, { prefix: '/api' });
    await app.register(authoringAgentRoutes, { prefix: '/api' });
    await app.register(btsBugfixRoutes, { prefix: '/api', 부르기: 가짜BTS });
    await app.ready();
    const 로그인 = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 사람, password: '열려라참깨' } });
    사람쿠키 = (로그인.headers['set-cookie'] as string).split(';')[0]!;
  });

  beforeEach(() => {
    for (const k of Object.keys(이슈들)) delete 이슈들[k];
  });

  afterAll(async () => {
    await app?.close();
    await 치우기();
    vi.unstubAllEnvs();
  });

  it('「개발 요청」이 아니거나 담당자가 QA Hub AI 가 아니면 맡지 않는다', async () => {
    이슈들['XBQ-1'] = { state: 'qa', assigneeId: 봇, componentIds: [] };
    이슈들['XBQ-2'] = { state: 'dev', assigneeId: 개발자, componentIds: [] };
    expect(await 수정맡기(프로젝트, 'XBQ-1', 가짜BTS)).toBe('NOT_MINE');
    expect(await 수정맡기(프로젝트, 'XBQ-2', 가짜BTS)).toBe('NOT_MINE');
    expect(await 수정줄('XBQ-1')).toEqual([]);
  });

  it('QA Hub 가 올린 이슈는 그 테스트의 애플리케이션 · 코드 저장소 첫 줄로 하나만 맡고, 집기에 이슈 글과 저장소가 실린다', async () => {
    이슈들['XBQ-3'] = { state: 'dev', assigneeId: 봇, componentIds: [] };
    await q(`INSERT INTO bts_issue_case (project_id, issue_key, service_id, tc_id, env) VALUES ($1, 'XBQ-3', $2, 'XBG-FN-001', 'qa')`, [프로젝트, 앱.XBG]);
    expect(await 수정맡기(프로젝트, 'XBQ-3', 가짜BTS)).toBe('TAKEN');
    expect(await 수정맡기(프로젝트, 'XBQ-3', 가짜BTS)).toBe('RUNNING');
    const [줄] = await 수정줄('XBQ-3');
    expect(줄!.requested_by_name).toBe('Issue Bunker · 연결 담당');
    expect(줄!.params.repo).toEqual({ name: '서버', url: 'https://github.com/demo/shop' });
    const 집은 = await 집기('XBG');
    expect(집은?.kind).toBe('BUGFIX');
    expect(집은?.bugfix?.issueKey).toBe('XBQ-3');
    expect(집은?.bugfix?.note).toContain('재현됨');
    expect(집은?.mcpKey).toMatch(/^mcj_/);
  });

  it('결과 없이 DONE 은 막고, PR 결과는 댓글 → 「코드 리뷰」 → 이메일이 같은 개발자에게 담당자를 보낼 줄에 넣는다', async () => {
    이슈들['XBQ-3'] = { state: 'dev', assigneeId: 봇, componentIds: [] };
    const id = Number((await 수정줄('XBQ-3'))[0]!.id);
    expect((await 끝내기(id, 'XBG', { status: 'DONE' })).json()).toEqual({ error: 'BAD_BUGFIX', detail: 'bugfix' });
    expect((await 결과(id, { prUrl: 'https://github.com/demo/other/pull/3', summary: 's', files: ['a.ts'], owners: [] })).json()).toEqual({ error: 'BAD_BUGFIX', detail: 'prUrl' });
    const 답 = await 결과(id, { prUrl: 'https://github.com/demo/shop/pull/8', summary: '할인율 계산을 고쳤어요', files: ['src/coupon.ts'], owners: [{ email: 'nobody@demo.test', name: '없는사람' }, { email: 'dev@demo.test', name: '김개발' }] });
    expect(답.statusCode).toBe(201);
    expect((await 수정줄('XBQ-3'))[0]!.pr_url).toBe('https://github.com/demo/shop/pull/8');
    expect((await 결과(id, { analysis: '두 번' })).statusCode).toBe(409);
    expect((await 끝내기(id, 'XBG', { status: 'DONE', prUrl: 'https://github.com/demo/shop/pull/8' })).json()).toEqual({ ok: true });
    await vi.waitFor(async () => expect((await 보낸줄('XBQ-3')).length).toBe(3));
    expect(((await 수정줄('XBQ-3'))[0]!.result as { bugfix: { owner: string } }).bugfix.owner).toBe(개발자);
    const 줄들 = await 보낸줄('XBQ-3');
    expect(줄들.map((x) => x.kind)).toEqual(['COMMENT', 'TRANSITION', 'ASSIGN']);
    expect(String(줄들[0]!.payload.body)).toContain('https://github.com/demo/shop/pull/8');
    expect(줄들[1]!.payload).toEqual({ toStatusKey: 'review' });
    expect(줄들[2]!.payload).toEqual({ assigneeId: 개발자 });
    expect((await 수정줄('XBQ-3'))[0]!.pr_url).toBe('https://github.com/demo/shop/pull/8');
  });

  it('사람은 수정 일을 다시 돌리지 못한다', async () => {
    const id = Number((await 수정줄('XBQ-3'))[0]!.id);
    const 답 = await app.inject({ method: 'POST', url: '/api/authoring/requests?service=XBG', headers: { cookie: 사람쿠키 }, payload: { kind: 'RERUN', sourceId: id } });
    expect(답.json()).toEqual({ error: 'BAD_KIND', detail: 'BUGFIX' });
  });

  it('PR 을 배포한 뒤 재검증이 또 실패하면 한 번만 넘겼던 사람에게 돌리고, 다시 「QA Hub AI」에 와도 맡지 않는다', async () => {
    expect(await 재검증실패넘기기(프로젝트, 'XBQ-3', '할인율 1%', 77, 가짜BTS)).toBe(false);
    const 배포 = Number((await q(`INSERT INTO bts_deploy (project_id, build_no, service_ids, run_ids, state) VALUES ($1, 'b-1', $2, '{}', 'CLAIMED') RETURNING id`, [프로젝트, [앱.XBG]])).rows[0].id);
    await q(`INSERT INTO bts_claim (project_id, issue_key, deploy_id, issue_type, claimed_at) VALUES ($1, 'XBQ-3', $2, 'BUG', now() + interval '1 second')`, [프로젝트, 배포]);
    expect(await 재검증실패넘기기(프로젝트, 'XBQ-3', '할인율 1%', 77, 가짜BTS)).toBe(true);
    expect(await 재검증실패넘기기(프로젝트, 'XBQ-3', '할인율 1%', 78, 가짜BTS)).toBe(false);
    const 뒤 = (await 보낸줄('XBQ-3')).slice(3);
    expect(뒤.map((x) => x.kind)).toEqual(['COMMENT', 'ASSIGN']);
    expect(String(뒤[0]!.payload.body)).toContain('또 실패');
    expect(String(뒤[0]!.payload.body)).toContain('src/coupon.ts');
    expect(뒤[1]!.payload).toEqual({ assigneeId: 개발자 });
    이슈들['XBQ-3'] = { state: 'dev', assigneeId: 봇, componentIds: [] };
    expect(await 수정맡기(프로젝트, 'XBQ-3', 가짜BTS)).toBe('HANDED_BACK');
    expect(await 수정줄('XBQ-3')).toHaveLength(1);
  });

  it('PR 을 냈어도 재검증 실패로 넘기기 전이면 사람이 다시 넘길 때 새로 맡는다 · whoami 를 못 읽으면 던진다', async () => {
    이슈들['XBQ-7'] = { state: 'dev', assigneeId: 봇, componentIds: [] };
    await q(`INSERT INTO bts_issue_case (project_id, issue_key, service_id, tc_id, env) VALUES ($1, 'XBQ-7', $2, 'XBG-FN-003', 'qa')`, [프로젝트, 앱.XBG]);
    await q(
      `INSERT INTO authoring_request (service_id, kind, params, requested_by, requested_by_name, status, pr_url, result) VALUES ($1, 'BUGFIX', $2, 'x', 'x', 'DONE', 'https://github.com/demo/shop/pull/9', '{"bugfix":{"prUrl":"https://github.com/demo/shop/pull/9","files":[],"owner":null}}')`,
      [앱.XBG, JSON.stringify({ issueKey: 'XBQ-7' })],
    );
    expect(await 수정맡기(프로젝트, 'XBQ-7', 가짜BTS)).toBe('TAKEN');
    expect((await 수정줄('XBQ-7')).map((x) => x.status)).toEqual(['DONE', 'PENDING']);
    const 아픈BTS: typeof 가짜BTS = async (자리, method, 경로) => (경로.endsWith('/whoami') ? { status: 503, json: null } : 가짜BTS(자리, method, 경로));
    await expect(수정맡기(프로젝트, 'XBQ-7', 아픈BTS)).rejects.toThrow('whoami');
    await q("DELETE FROM authoring_request WHERE kind = 'BUGFIX' AND params->>'issueKey' = 'XBQ-7'");
  });

  it('사람이 올린 버그는 구성 요소 이름으로 애플리케이션을 고르고, 저장소가 없으면 「코드 없음」 분석과 구성 요소 리드에게 넘긴다', async () => {
    이슈들['XBQ-4'] = { state: 'dev', assigneeId: 봇, componentIds: ['c1', 'c2'] };
    expect(await 수정맡기(프로젝트, 'XBQ-4', 가짜BTS)).toBe('TAKEN');
    const [줄] = await 수정줄('XBQ-4');
    expect(줄!.params.repo).toBeNull();
    await q("DELETE FROM authoring_request WHERE project_id = $1 AND kind = 'NOTE'", [프로젝트]);
    const 집은 = await 집기('XBG2');
    expect(집은).toMatchObject({ kind: 'BUGFIX' });
    expect(집은?.bugfix?.repo).toBeNull();
    expect((await 결과(집은!.id, { analysis: '할인율 상수가 0.01 이에요', owners: [] })).statusCode).toBe(201);
    await vi.waitFor(async () => expect((await 보낸줄('XBQ-4')).length).toBe(2));
    const 줄들 = await 보낸줄('XBQ-4');
    expect(줄들.map((x) => x.kind)).toEqual(['COMMENT', 'ASSIGN']);
    expect(String(줄들[0]!.payload.body)).toMatch(/^코드 없음 — 원인 분석만/);
    expect(줄들[1]!.payload).toEqual({ assigneeId: 리드 });
  });

  it('애플리케이션을 못 고르면 맡지 않고 프로젝트 리드에게 넘긴다', async () => {
    이슈들['XBQ-5'] = { state: 'dev', assigneeId: 봇, componentIds: [] };
    expect(await 수정맡기(프로젝트, 'XBQ-5', 가짜BTS)).toBe('NO_APP');
    expect((await 보낸줄('XBQ-5')).map((x) => [x.kind, x.payload.assigneeId ?? null])).toEqual([['COMMENT', null], ['ASSIGN', 리드]]);
  });

  it('결과 없이 실패로 끝나면 사람에게 넘기고, 에이전트가 꺼져 멈추면 같은 일을 새로 세운다', async () => {
    이슈들['XBQ-6'] = { state: 'dev', assigneeId: 봇, componentIds: ['c2'] };
    await q(`INSERT INTO bts_issue_case (project_id, issue_key, service_id, tc_id, env) VALUES ($1, 'XBQ-6', $2, 'XBG-FN-002', 'qa')`, [프로젝트, 앱.XBG]);
    expect(await 수정맡기(프로젝트, 'XBQ-6', 가짜BTS)).toBe('TAKEN');
    const 하나 = await 집기('XBG');
    expect((await 끝내기(하나!.id, 'XBG', { status: 'STOPPED', stopReason: 'AGENT_RESTART' })).json()).toEqual({ ok: true });
    await vi.waitFor(async () => expect((await 수정줄('XBQ-6')).map((x) => x.status)).toEqual(['STOPPED', 'PENDING']));
    const 둘 = await 집기('XBG');
    vi.stubGlobal('fetch', async (url: string, init?: { method?: string }) => {
      const 답 = await 가짜BTS({ baseUrl: '', botKey: '' }, init?.method ?? 'GET', url.replace('https://bts.xbg.test', ''));
      return new Response(JSON.stringify(답.json), { status: 답.status });
    });
    expect((await 끝내기(둘!.id, 'XBG', { status: 'FAILED', error: 'claude 를 못 띄웠다' })).json()).toEqual({ ok: true });
    await vi.waitFor(async () => expect((await 보낸줄('XBQ-6')).map((x) => x.kind)).toEqual(['COMMENT', 'ASSIGN']));
    expect(String((await 보낸줄('XBQ-6'))[0]!.payload.body)).toContain('claude 를 못 띄웠다');
    expect((await 보낸줄('XBQ-6'))[1]!.payload).toEqual({ assigneeId: 리드 });
    vi.unstubAllGlobals();
  });
});
