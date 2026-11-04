// /mcp 조회 도구를 실제 DB 와 같이 본다 — 화면 문과 같은 권한 · bts_search 의 대신 PAT. 로그인 토큰 확인은 oauth.test.ts. Auth 와 BTS 는 가짜다. DATABASE_URL이 있을 때만 돈다

import type { CaseSpec } from '@platform/kit';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { 대신PAT기억비우기 } from '../auth/delegatedPat.js';
import { 인증등록 } from '../auth/gate.js';
import { 세션등록 } from '../auth/session.js';
import type { 부르기함수 } from '../bts/client.js';
import { save } from '../catalog/store.js';
import { 가짜Auth띄우기, type 가짜Auth } from './authFixture.js';
import mcpRoutes from './server.js';

const 연결 = process.env.DATABASE_URL;
const 계정들 = ['xmc-me', 'xmc-part'];
const 케이스들 = ['XMC-FN-001', 'XMC-FN-002'];

const spec = (tcId: string, name: string): CaseSpec => ({
  tcId,
  name,
  platforms: ['desktop'],
  precondition: [],
  paramSchema: { type: 'object', properties: {} },
  expectedSchema: { type: 'object', properties: {} },
  filePath: `xmc/${tcId}.spec.ts`,
});

type 답몸 = { result?: { content: { text: string }[]; isError?: boolean; tools?: { name: string }[] }; error?: { message: string } };

describe.skipIf(연결 === undefined)('MCP 창구', () => {
  let app: FastifyInstance;
  let 내프로젝트 = 0;
  let 남프로젝트 = 0;
  let 내앱 = 0;
  let 남앱 = 0;
  let 내실행 = 0;
  let 남실행 = 0;
  let auth: 가짜Auth;
  let 내토큰 = '';
  const BTS받은것: { 열쇠: string; method: string; 경로: string; 몸?: unknown }[] = [];
  const 부르기: 부르기함수 = async (자리, method, 경로, 몸) => {
    BTS받은것.push({ 열쇠: 'pat' in 자리 ? 자리.pat : `봇:${자리.봇}`, method, 경로, 몸 });
    if (경로 === '/api/v1/issues/XMQ-404') return { status: 404, json: null };
    if (경로 === '/api/v1/issues/XMQ-0') return { status: 200, json: { data: null } };
    if (경로 === '/api/v1/issues/XMQ-13/comments') return { status: 500, json: null };
    if (경로.endsWith('/comments')) {
      const 댓글 = Array.from({ length: 25 }, (_, i) => ({ id: `c${String(i)}`, authorId: 'u1', body: i === 24 ? '마'.repeat(1200) : `댓글 ${String(i + 1)}`, bodyHtml: '<p>x</p>', createdAt: `2026-11-01T00:00:${String(i).padStart(2, '0')}Z` }));
      return { status: 200, json: { data: 댓글 } };
    }
    const 이슈 = { key: 'XMQ-12', summary: '로그인 잠금', currentStateKey: 'closed', assigneeId: 'u1', priority: 3, customFields: { 등급: '높음' } };
    if (경로.startsWith('/api/v1/issues/')) return { status: 200, json: { data: { ...이슈, description: '가'.repeat(5000) } } };
    return { status: 200, json: { data: Array.from({ length: 30 }, (_, i) => ({ ...이슈, key: `XMQ-${String(i + 1)}` })), meta: { page: { number: 0, size: 30, totalElements: 61, totalPages: 3 } } } };
  };

  const q = async (sql: string, 값: unknown[] = []) => (await import('../db/index.js')).pool.query(sql, 값);

  async function 치우기() {
    await q('DELETE FROM case_screen WHERE tc_id = ANY($1)', [케이스들]);
    const 앱들 = (await q(`SELECT id FROM service WHERE prefix IN ('XMC', 'XMCB')`)).rows.map((r: { id: string }) => Number(r.id));
    await q('DELETE FROM req_case WHERE service_id = ANY($1)', [앱들]);
    await q('DELETE FROM prd_version WHERE service_id = ANY($1)', [앱들]);
    await q('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = ANY($1))', [앱들]);
    await q('DELETE FROM test_run WHERE service_id = ANY($1)', [앱들]);
    await q('DELETE FROM test_case WHERE tc_id = ANY($1)', [케이스들]);
    await q('DELETE FROM user_project WHERE username = ANY($1)', [계정들]);
    await q('DELETE FROM app_user WHERE username = ANY($1)', [계정들]);
    // 프로젝트는 애플리케이션이 다 지워지면 트리거가 지운다 · bts_link 는 프로젝트와 같이 간다
    await q('DELETE FROM service WHERE id = ANY($1)', [앱들]);
  }

  const 부르기MCP = async (열쇠: string | null, method: string, params: unknown = {}, 방식 = 'Bearer') =>
    app.inject({
      method: 'POST',
      url: '/mcp',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        ...(열쇠 !== null && { authorization: `${방식} ${열쇠}` }),
      },
      payload: { jsonrpc: '2.0', id: 1, method, params },
    });

  const 도구 = async (name: string, args: Record<string, unknown>, 열쇠 = 내토큰) => {
    const res = await 부르기MCP(열쇠, 'tools/call', { name, arguments: args });
    expect(res.statusCode).toBe(200);
    const 결과 = (res.json() as 답몸).result!;
    const 글 = 결과.content[0]!.text;
    return { 오류: 결과.isError === true, 글, json: () => JSON.parse(글) as Record<string, unknown> };
  };

  beforeAll(async () => {
    auth = await 가짜Auth띄우기();
    내토큰 = await auth.토큰('xmc-sub-me');
    vi.stubEnv('AUTH_ISSUER', auth.issuer);
    vi.stubEnv('AUTH_CLIENT_ID', 'test-platform');
    vi.stubEnv('AUTH_CLIENT_SECRET', 'xmc-secret');
    vi.stubEnv('PLATFORM_PUBLIC_URL', 'http://localhost:3000/');
    await 치우기();

    내프로젝트 = Number((await q(`INSERT INTO project (name) VALUES ('XMC 프로젝트') RETURNING id`)).rows[0].id);
    남프로젝트 = Number((await q(`INSERT INTO project (name) VALUES ('XMC 다른 프로젝트') RETURNING id`)).rows[0].id);
    const 앱 = async (prefix: string, 프로젝트: number) =>
      Number((await q(`INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id) VALUES ($1, $1, '#123456', '', $2, $3) RETURNING id`, [prefix, prefix.toLowerCase(), 프로젝트])).rows[0].id);
    내앱 = await 앱('XMC', 내프로젝트);
    남앱 = await 앱('XMCB', 남프로젝트);

    for (const [이름, sub] of [['xmc-me', 'xmc-sub-me'], ['xmc-part', 'xmc-sub-part']] as const) {
      await q(
        `INSERT INTO app_user (username, display_name, password_hash, role, perm_dashboard, is_approved, must_change_password, auth_sub, is_active)
         VALUES ($1, $1, NULL, 'member', 'none', true, false, $2, $3)`,
        [이름, sub, true],
      );
    }
    await q(`INSERT INTO user_project (username, project_id, perm_cases, perm_runs, perm_authoring) VALUES ('xmc-me', $1, 'read', 'read', 'read')`, [내프로젝트]);
    await q(`INSERT INTO user_project (username, project_id, perm_cases, perm_runs, perm_authoring) VALUES ('xmc-part', $1, 'read', 'none', 'none')`, [내프로젝트]);

    await save([spec('XMC-FN-001', '다섯 번 틀리면 잠금'), spec('XMC-FN-002', '비밀번호 길이')], false, 'XMC');
    await q(
      `INSERT INTO prd_version (service_id, version, items, last_no, source, saved_by, saved_by_name) VALUES ($1, 1, $2, 2, 'PERSON', 'xmc', 'xmc')`,
      [
        내앱,
        JSON.stringify([
          { reqId: 'XMC-REQ-001', feature: '로그인', text: '다섯 번 틀리면 잠근다', basis: [], status: 'CONFIRMED' },
          { reqId: 'XMC-REQ-002', feature: '회원가입', text: '비밀번호는 8자 이상', basis: [], status: 'CONFIRMED' },
        ]),
      ],
    );
    await q(`INSERT INTO req_case (service_id, req_id, tc_id, axis) VALUES ($1, 'XMC-REQ-001', 'XMC-FN-001', '정상'), ($1, 'XMC-REQ-001', 'XMC-FN-002', '경계')`, [내앱]);
    await q(`INSERT INTO case_screen (tc_id, file, screen_url, name, open_urls) VALUES ('XMC-FN-001', 'xmc/pages/login.page.ts', '/login', '로그인', '{/board/:n/edit}')`);
    await q(`INSERT INTO case_screen (tc_id, file, screen_url, name) VALUES ('XMC-FN-002', 'xmc/pages/login.page.ts', '/login', '로그인')`);
    // 지운 케이스 — 지도에 줄이 남아 있어도 도구가 보이지 않아야 한다
    await q(`UPDATE test_case SET is_active = false WHERE tc_id = 'XMC-FN-002'`);
    await q(
      `INSERT INTO bts_link (project_id, base_url, bts_project, bot_username, webhook_secret, status_map, resolution_map, updated_by)
       VALUES ($1, 'https://bts.xmc.test', 'XMQ', 'xmc-bot', 's', '{}', '{}', 'xmc')`,
      [내프로젝트],
    );
    const 실행 = async (앱번호: number, 이름: string) =>
      Number(
        (await q(`INSERT INTO test_run (title, triggered_by, status, env, service_id, service_name, tests_repo, base_url) VALUES ($1, 'xmc', 'FINISHED', 'qa', $2, $1, '', 'https://qa.xmc.test') RETURNING run_id`, [이름, 앱번호]))
          .rows[0].run_id,
      );
    내실행 = await 실행(내앱, 'XMC');
    await q(
      `INSERT INTO run_item (run_id, tc_id, platform, attempt, tc_name, file_path, timeout_ms, precondition, params, expected, param_schema, expected_schema, status, duration_ms, finished_at, error)
       VALUES ($1, 'XMC-FN-001', 'desktop', 1, '다섯 번 틀리면 잠금', 'xmc/a.spec.ts', 300000, '[]', $2, '{}', '{"type":"object"}', '{}', 'FAIL', 10, now(), $3),
              ($1, 'XMC-FN-002', 'desktop', 1, '비밀번호 길이', 'xmc/b.spec.ts', 300000, '[]', '{}', '{}', '{}', '{}', 'PASS', 10, now(), NULL),
              ($1, 'XMC-FN-002', 'mobile', 1, '비밀번호 길이', 'xmc/b.spec.ts', 300000, '[]', '{}', '{}', '{}', '{}', 'NA', 10, now(), NULL),
              ($1, 'XMC-FN-001', 'mobile', 1, '다섯 번 틀리면 잠금', 'xmc/a.spec.ts', 300000, '[]', '{}', '{}', '{}', '{}', 'NA', NULL, NULL, NULL)`,
      [내실행, JSON.stringify({ 메모: '나'.repeat(300), 횟수: 5, 목록: Array.from({ length: 100 }, (_, i) => i) }), JSON.stringify({ message: '다'.repeat(600), stack: '라'.repeat(2000) })],
    );
    남실행 = await 실행(남앱, 'XMCB');

    app = Fastify();
    세션등록(app, 'xmc-검사용-세션-열쇠-32글자를-넘긴다-넉넉히');
    인증등록(app);
    await app.register(mcpRoutes, { 부르기 });
    await app.ready();
  });

  beforeEach(() => {
    대신PAT기억비우기();
    auth.대신PAT요청.length = 0;
    BTS받은것.length = 0;
  });

  afterAll(async () => {
    await app?.close();
    await auth?.닫기();
    await 치우기();
    vi.unstubAllEnvs();
  });

  it('처음 인사와 도구 목록 — 조회 도구 여섯', async () => {
    const 인사 = await 부르기MCP(내토큰, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'xmc', version: '1' } });
    expect(인사.statusCode).toBe(200);
    expect(인사.json()).toMatchObject({ result: { serverInfo: { name: 'qa-hub' }, instructions: expect.stringContaining('기대값의 근거는 사람이 확정한 PRD 요구 문장뿐이다') } });
    const 목록 = (await 부르기MCP(내토큰, 'tools/list')).json() as 답몸;
    expect(목록.result!.tools!.map((t) => t.name).sort()).toEqual(['bts_search', 'map_search', 'note_read', 'prd_search', 'run_result', 'run_search']);
  });

  it('PRD 요구 찾기 — 낱말이 든 요구와 덮는 케이스, 배정 밖 애플리케이션은 FORBIDDEN', async () => {
    const 답 = await 도구('prd_search', { service: 'XMC', query: '잠근다' });
    expect(답.오류).toBe(false);
    expect(답.json()).toMatchObject({ version: 1, total: 1, items: [{ reqId: 'XMC-REQ-001', cases: ['XMC-FN-001'] }] });
    // 낱말은 띄어쓰기로 쪼개 모두 든 요구 — 차례가 달라도, 기능과 문장에 나뉘어 들어도 걸린다
    expect(await 도구('prd_search', { service: 'XMC', query: '잠근다 로그인' }).then((r) => r.json())).toMatchObject({ total: 1, items: [{ reqId: 'XMC-REQ-001' }] });
    expect(await 도구('prd_search', { service: 'XMC', query: '잠근다  8자' }).then((r) => r.json())).toMatchObject({ total: 0, items: [] });
    expect(await 도구('prd_search', { service: 'XMC', query: '', page: 1 }).then((r) => r.json())).toMatchObject({ total: 2, items: [] });
    const 남 = await 도구('prd_search', { service: 'XMCB', query: '' });
    expect(남.오류).toBe(true);
    expect(남.글).toContain('FORBIDDEN');
  });

  it('지도 찾기 — 요구 · 케이스 · 화면 주소(파일 안에서 여는 화면도) 어느 쪽으로도 같은 줄, 지운 케이스는 안 보이고 남의 케이스 번호는 FORBIDDEN', async () => {
    const 기대 = {
      cases: [{ tcId: 'XMC-FN-001', reqs: [{ reqId: 'XMC-REQ-001', axis: '정상' }], screens: [{ name: '로그인', url: '/login', opens: ['/board/:n/edit'] }] }],
    };
    expect((await 도구('map_search', { service: 'XMC', reqId: 'XMC-REQ-001' })).json()).toEqual(기대);
    expect((await 도구('map_search', { service: 'XMC', tcId: 'XMC-FN-001' })).json()).toEqual(기대);
    expect((await 도구('map_search', { service: 'XMC', url: 'login' })).json()).toEqual(기대);
    expect((await 도구('map_search', { service: 'XMC', url: '/edit' })).json()).toEqual(기대);
    expect((await 도구('map_search', { service: 'XMC', tcId: 'XMC-FN-002' })).글).toContain('NOT_FOUND');
    expect((await 도구('map_search', { service: 'XMC', reqId: 'XMC-REQ-002' })).json()).toEqual({ cases: [], empty: 'XMC-REQ-002 를 덮는 살아 있는 케이스가 아직 없다' });
    expect((await 도구('map_search', { service: 'XMC', reqId: 'XMC-REQ-999' })).글).toContain('NOT_FOUND — XMC-REQ-999 는 지금 PRD 판에 없는 요구다');
    expect((await 도구('map_search', { service: 'XMC', url: '/nowhere' })).json()).toMatchObject({ cases: [], empty: expect.stringContaining('/nowhere') });
    expect((await 도구('map_search', { service: 'XMC', tcId: 'XMCB-FN-001' })).글).toContain('FORBIDDEN');
    expect((await 도구('map_search', { service: 'XMC', url: 'login', page: 1 })).json()).toEqual({ cases: [], empty: 'page 1 에는 더 없다' });
    expect((await 도구('map_search', { service: 'XMC', tcId: 'XMC-FN-001', page: 1 })).json()).toEqual({ cases: [], empty: 'page 1 에는 더 없다' });
  });

  it('배정은 받았어도 칸이 없으면 화면처럼 막힌다 — 케이스 read 만 있는 사람은 지도만 본다', async () => {
    const 일부 = await auth.토큰('xmc-sub-part');
    expect((await 도구('map_search', { service: 'XMC', tcId: 'XMC-FN-001' }, 일부)).오류).toBe(false);
    expect((await 도구('prd_search', { service: 'XMC', query: '' }, 일부)).글).toContain('FORBIDDEN — authoring:read');
    expect((await 도구('run_result', { runId: 내실행 }, 일부)).글).toContain('FORBIDDEN — runs:read');
    expect((await 도구('bts_search', { projectId: 내프로젝트, query: '잠금' }, 일부)).글).toContain('FORBIDDEN');
    expect(BTS받은것).toHaveLength(0);
    expect(auth.대신PAT요청).toHaveLength(0);
  });

  it('실행 결과 보기 — 통과는 수로만, 실패 · 미실행만 줄로 잘라서 싣고, 남의 실행은 FORBIDDEN, 없는 번호는 NOT_FOUND', async () => {
    const 몸 = (await 도구('run_result', { runId: 내실행 })).json();
    expect(몸).toMatchObject({ runId: 내실행, triggeredBy: 'xmc', counts: { total: 4, pass: 1, fail: 1, running: 1 }, evidence: [] });
    for (const 뺀칸 of ['itemsTotal', 'installedApps', 'triggeredByName', 'truncated']) expect(몸).not.toHaveProperty(뺀칸);
    const 줄 = 몸.items as Record<string, unknown>[];
    expect(줄.map((i) => [i.tcId, i.status])).toEqual([['XMC-FN-001', 'FAIL'], ['XMC-FN-002', 'NA']]);
    expect(Object.keys(줄[0]!).sort()).toEqual(['attempt', 'durationMs', 'error', 'params', 'platform', 'status', 'tcId', 'tcName', 'unconfirmed']);
    expect(줄[0]!.error).toEqual({ message: `${'다'.repeat(500)}…(이하 생략)`, stack: `${'라'.repeat(1000)}…(이하 생략)` });
    expect(줄[0]!.params).toEqual({ 메모: `${'나'.repeat(200)}…(이하 생략)`, 횟수: 5, 목록: `${JSON.stringify(Array.from({ length: 100 }, (_, i) => i)).slice(0, 200)}…(이하 생략)` });
    expect(((await 도구('run_result', { runId: 내실행, page: 1 })).json() as { items: unknown[] }).items).toEqual([]);
    expect((await 도구('run_result', { runId: 남실행 })).글).toContain('FORBIDDEN');
    expect((await 도구('run_result', { runId: 2_000_000_000 })).글).toContain('NOT_FOUND');
  });

  it('BTS 찾기 — 받은 토큰을 넘기지 않고 부른 사람의 대신 PAT 로 BTS 를 부르고, 이은 BTS 프로젝트 밖 키 · 배정 밖 프로젝트는 막는다', async () => {
    const 하나 = (await 도구('bts_search', { projectId: 내프로젝트, issueKey: 'XMQ-12' })).json() as { comments: { body: string; createdAt: string }[] };
    expect(하나).toMatchObject({ key: 'XMQ-12', title: '로그인 잠금', status: 'closed', body: `${'가'.repeat(4000)}…(이하 생략)`, moreComments: 5 });
    expect(Object.keys(하나).sort()).toEqual(['body', 'comments', 'key', 'moreComments', 'status', 'title']);
    // 최근 20개를 오래된 것부터 — 6번째 댓글부터 25번째까지, 마지막은 1,000자에서 자른다
    expect(하나.comments).toHaveLength(20);
    expect(하나.comments[0]).toEqual({ body: '댓글 6', createdAt: '2026-11-01T00:00:05Z' });
    expect(하나.comments[19]!.body).toBe(`${'마'.repeat(1000)}…(이하 생략)`);
    expect(BTS받은것.slice(0, 2)).toMatchObject([
      { 열쇠: 'pat_dlg_xmc-sub-me', method: 'GET', 경로: '/api/v1/issues/XMQ-12' },
      { 열쇠: 'pat_dlg_xmc-sub-me', method: 'GET', 경로: '/api/v1/issues/XMQ-12/comments' },
    ]);
    // 대신 PAT 는 Commander 비밀로 한 번 받아 기억한다
    expect(auth.대신PAT요청).toEqual([{ 경로: '/api/v1/delegated-pats', basic: true, 몸: { userId: 'xmc-sub-me' } }]);
    expect((await 도구('bts_search', { projectId: 내프로젝트, issueKey: 'XMQ-13' })).json()).toMatchObject({ key: 'XMQ-12', comments: [], commentsError: 'HTTP 500' });

    const 찾음 = (await 도구('bts_search', { projectId: 내프로젝트, query: '잠금 "따옴표"', page: 1 })).json() as { items: unknown[]; truncated?: boolean };
    expect(BTS받은것[4]).toMatchObject({ 열쇠: 'pat_dlg_xmc-sub-me', method: 'POST', 경로: '/api/v1/search/aql', 몸: { projectKey: 'XMQ', query: 'text ~ "잠금 \\"따옴표\\""', page: 1, size: 30 } });
    expect(찾음.items).toHaveLength(30);
    expect(찾음.items[0]).toEqual({ key: 'XMQ-1', title: '로그인 잠금', status: 'closed' });
    expect(찾음.truncated).toBe(true);
    // 전체 61개 중 셋째 쪽(61번째 하나)이면 더 없다
    expect(((await 도구('bts_search', { projectId: 내프로젝트, query: '잠금', page: 2 })).json() as { truncated?: boolean }).truncated).toBeUndefined();

    expect((await 도구('bts_search', { projectId: 내프로젝트, issueKey: 'XMQ-404' })).글).toContain('NOT_FOUND');
    expect((await 도구('bts_search', { projectId: 내프로젝트, issueKey: 'XMQ-0' })).글).toContain('BTS_ERROR — Issue Bunker 가 빈 답을 줬다');
    expect((await 도구('bts_search', { projectId: 내프로젝트, issueKey: 'OTHER-1' })).글).toContain('FORBIDDEN');
    expect((await 도구('bts_search', { projectId: 남프로젝트, query: '잠금' })).글).toContain('FORBIDDEN');
    // 없는 이슈 · 빈 이슈에는 댓글을 부르지 않는다
    expect(BTS받은것).toHaveLength(8);
  });

  it('세션 없는 창구라 GET · DELETE 는 405', async () => {
    expect((await app.inject({ method: 'GET', url: '/mcp' })).statusCode).toBe(405);
    expect((await app.inject({ method: 'DELETE', url: '/mcp' })).statusCode).toBe(405);
  });
});
