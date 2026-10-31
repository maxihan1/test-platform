// /mcp 창구를 실제 DB 와 같이 본다 — PAT 확인 · 도구 넷 · 화면 문과 같은 권한. Auth whoami 와 BTS 는 가짜다. DATABASE_URL이 있을 때만 돈다

import type { CaseSpec } from '@platform/kit';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { 인증등록 } from '../auth/gate.js';
import { PAT기억비우기 } from '../auth/pat.js';
import { 세션등록 } from '../auth/session.js';
import type { 부르기함수 } from '../bts/client.js';
import { save } from '../catalog/store.js';
import { 일열쇠내기 } from './jobKey.js';
import mcpRoutes from './server.js';

const 연결 = process.env.DATABASE_URL;
const 계정들 = ['xmc-me', 'xmc-off', 'xmc-part', 'xmc-agent'];
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
  const 묻기 = vi.fn(async (_issuer: string, 토큰: string) => {
    if (토큰 === 'pat_me000001') return { 주인: 'xmc-sub-me' };
    if (토큰 === 'pat_off00001') return { 주인: 'xmc-sub-off' };
    if (토큰 === 'pat_part0001') return { 주인: 'xmc-sub-part' };
    if (토큰 === 'pat_down0001') return '닿지못함' as const;
    return '틀림' as const;
  });
  const BTS받은것: { 열쇠: string; method: string; 경로: string; 몸?: unknown }[] = [];
  const 부르기: 부르기함수 = async (자리, method, 경로, 몸) => {
    BTS받은것.push({ 열쇠: 자리.botKey, method, 경로, 몸 });
    if (경로 === '/api/v1/issues/XMQ-404') return { status: 404, json: null };
    return { status: 200, json: { data: 경로.startsWith('/api/v1/issues/') ? { key: 'XMQ-12', summary: '로그인 잠금' } : [{ key: 'XMQ-12' }] } };
  };

  const q = async (sql: string, 값: unknown[] = []) => (await import('../db/index.js')).pool.query(sql, 값);

  async function 치우기() {
    await q('DELETE FROM case_screen WHERE tc_id = ANY($1)', [케이스들]);
    const 앱들 = (await q(`SELECT id FROM service WHERE prefix IN ('XMC', 'XMCB')`)).rows.map((r: { id: string }) => Number(r.id));
    await q('DELETE FROM req_case WHERE service_id = ANY($1)', [앱들]);
    await q('DELETE FROM prd_version WHERE service_id = ANY($1)', [앱들]);
    await q('DELETE FROM test_run WHERE service_id = ANY($1)', [앱들]);
    await q('DELETE FROM authoring_request WHERE service_id = ANY($1)', [앱들]);
    await q('DELETE FROM test_case WHERE tc_id = ANY($1)', [케이스들]);
    await q('DELETE FROM user_project WHERE username = ANY($1)', [계정들]);
    await q('DELETE FROM app_user WHERE username = ANY($1)', [계정들]);
    // 프로젝트는 애플리케이션이 다 지워지면 트리거가 지운다 · bts_link 는 프로젝트와 같이 간다
    await q('DELETE FROM service WHERE id = ANY($1)', [앱들]);
  }

  const 부르기MCP = async (pat: string | null, method: string, params: unknown = {}, 방식 = 'Bearer') =>
    app.inject({
      method: 'POST',
      url: '/mcp',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        ...(pat !== null && { authorization: `${방식} ${pat}` }),
      },
      payload: { jsonrpc: '2.0', id: 1, method, params },
    });

  const 도구 = async (name: string, args: Record<string, unknown>, pat = 'pat_me000001') => {
    const res = await 부르기MCP(pat, 'tools/call', { name, arguments: args });
    expect(res.statusCode).toBe(200);
    const 결과 = (res.json() as 답몸).result!;
    const 글 = 결과.content[0]!.text;
    return { 오류: 결과.isError === true, 글, json: () => JSON.parse(글) as Record<string, unknown> };
  };

  beforeAll(async () => {
    vi.stubEnv('AUTH_ISSUER', 'http://127.0.0.1:9/');
    vi.stubEnv('AUTH_CLIENT_ID', 'test-platform');
    vi.stubEnv('AUTH_CLIENT_SECRET', 'xmc-secret');
    vi.stubEnv('PLATFORM_PUBLIC_URL', 'http://localhost:3000/');
    vi.stubEnv('AUTHORING_AGENT_USER', 'xmc-agent');
    await 치우기();

    내프로젝트 = Number((await q(`INSERT INTO project (name) VALUES ('XMC 프로젝트') RETURNING id`)).rows[0].id);
    남프로젝트 = Number((await q(`INSERT INTO project (name) VALUES ('XMC 다른 프로젝트') RETURNING id`)).rows[0].id);
    const 앱 = async (prefix: string, 프로젝트: number) =>
      Number((await q(`INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id) VALUES ($1, $1, '#123456', '', $2, $3) RETURNING id`, [prefix, prefix.toLowerCase(), 프로젝트])).rows[0].id);
    내앱 = await 앱('XMC', 내프로젝트);
    남앱 = await 앱('XMCB', 남프로젝트);

    for (const [이름, sub] of [['xmc-me', 'xmc-sub-me'], ['xmc-off', 'xmc-sub-off'], ['xmc-part', 'xmc-sub-part'], ['xmc-agent', 'xmc-sub-agent']] as const) {
      await q(
        `INSERT INTO app_user (username, display_name, password_hash, role, perm_dashboard, is_approved, must_change_password, auth_sub, is_active)
         VALUES ($1, $1, NULL, 'member', 'none', true, false, $2, $3)`,
        [이름, sub, 이름 !== 'xmc-off'],
      );
    }
    await q(`INSERT INTO user_project (username, project_id, perm_cases, perm_runs, perm_authoring) VALUES ('xmc-me', $1, 'read', 'read', 'read')`, [내프로젝트]);
    await q(`INSERT INTO user_project (username, project_id, perm_cases, perm_runs, perm_authoring) VALUES ('xmc-part', $1, 'read', 'none', 'none')`, [내프로젝트]);
    // 작성 계정은 두 프로젝트에 다 배정돼 있다 — 열쇠가 그 줄의 프로젝트로 좁히는지 본다
    await q(`INSERT INTO user_project (username, project_id, perm_cases, perm_runs, perm_authoring) VALUES ('xmc-agent', $1, 'write', 'write', 'write'), ('xmc-agent', $2, 'write', 'write', 'write')`, [내프로젝트, 남프로젝트]);

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
      `INSERT INTO bts_link (project_id, base_url, bts_project, bot_key, webhook_secret, status_map, resolution_map, updated_by)
       VALUES ($1, 'https://bts.xmc.test', 'XMQ', 'bot-key', 's', '{}', '{}', 'xmc')`,
      [내프로젝트],
    );
    const 실행 = async (앱번호: number, 이름: string) =>
      Number(
        (await q(`INSERT INTO test_run (title, triggered_by, status, env, service_id, service_name, tests_repo, base_url) VALUES ($1, 'xmc', 'FINISHED', 'qa', $2, $1, '', 'https://qa.xmc.test') RETURNING run_id`, [이름, 앱번호]))
          .rows[0].run_id,
      );
    내실행 = await 실행(내앱, 'XMC');
    남실행 = await 실행(남앱, 'XMCB');

    app = Fastify();
    세션등록(app, 'xmc-검사용-세션-열쇠-32글자를-넘긴다-넉넉히');
    인증등록(app);
    await app.register(mcpRoutes, { 묻기, 부르기 });
    await app.ready();
  });

  beforeEach(() => {
    PAT기억비우기();
    묻기.mockClear();
    BTS받은것.length = 0;
  });

  afterAll(async () => {
    await app?.close();
    await 치우기();
    vi.unstubAllEnvs();
  });

  it('열쇠가 없거나 틀리거나 꺼진 계정이면 401, Auth 에 못 닿으면 503', async () => {
    expect((await 부르기MCP(null, 'tools/list')).statusCode).toBe(401);
    expect((await 부르기MCP('pat_wrong001', 'tools/list')).statusCode).toBe(401);
    expect((await 부르기MCP('pat_off00001', 'tools/list')).statusCode).toBe(401);
    expect((await 부르기MCP('pat_down0001', 'tools/list')).statusCode).toBe(503);
    // PAT 꼴이 아니면 Auth 에 묻지도 않는다
    expect((await 부르기MCP('cit_abc', 'tools/list')).statusCode).toBe(401);
    expect(묻기).not.toHaveBeenCalledWith(expect.anything(), 'cit_abc');
  });

  it('열쇠는 몸을 읽기 전에 본다 — 열쇠 없이 깨진 몸을 보내도 400 이 아니라 401', async () => {
    const res = await app.inject({ method: 'POST', url: '/mcp', headers: { 'content-type': 'application/json' }, payload: '{깨진' });
    expect(res.statusCode).toBe(401);
  });

  it('맞는 PAT 도 틀린 PAT 도 1분 동안 Auth 에 다시 묻지 않는다 · 방식 이름은 대소문자를 안 가린다', async () => {
    await 부르기MCP('pat_me000001', 'tools/list');
    expect((await 부르기MCP('pat_me000001', 'tools/list', {}, 'bearer')).statusCode).toBe(200);
    await 부르기MCP('pat_wrong001', 'tools/list');
    await 부르기MCP('pat_wrong001', 'tools/list');
    expect(묻기).toHaveBeenCalledTimes(2);
  });

  it('기억에 없는 토큰으로 1분에 30번 넘게 Auth 를 두드리면 429', async () => {
    for (let i = 0; i < 30; i++) expect((await 부르기MCP(`pat_try${String(i).padStart(5, '0')}`, 'tools/list')).statusCode).toBe(401);
    expect((await 부르기MCP('pat_try99999', 'tools/list')).statusCode).toBe(429);
    expect(묻기).toHaveBeenCalledTimes(30);
  });

  it('처음 인사와 도구 목록 — 조회 도구 넷', async () => {
    const 인사 = await 부르기MCP('pat_me000001', 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'xmc', version: '1' } });
    expect(인사.statusCode).toBe(200);
    expect(인사.json()).toMatchObject({ result: { serverInfo: { name: 'qa-hub' } } });
    const 목록 = (await 부르기MCP('pat_me000001', 'tools/list')).json() as 답몸;
    expect(목록.result!.tools!.map((t) => t.name).sort()).toEqual(['bts_search', 'map_search', 'prd_search', 'run_result']);
  });

  it('PRD 요구 찾기 — 낱말이 든 요구와 덮는 케이스, 배정 밖 애플리케이션은 FORBIDDEN', async () => {
    const 답 = await 도구('prd_search', { service: 'XMC', query: '잠근다' });
    expect(답.오류).toBe(false);
    expect(답.json()).toMatchObject({ version: 1, total: 1, items: [{ reqId: 'XMC-REQ-001', cases: ['XMC-FN-001'] }] });
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
    expect((await 도구('map_search', { service: 'XMC', tcId: 'XMCB-FN-001' })).글).toContain('FORBIDDEN');
  });

  it('배정은 받았어도 칸이 없으면 화면처럼 막힌다 — 케이스 read 만 있는 사람은 지도만 본다', async () => {
    expect((await 도구('map_search', { service: 'XMC', tcId: 'XMC-FN-001' }, 'pat_part0001')).오류).toBe(false);
    expect((await 도구('prd_search', { service: 'XMC', query: '' }, 'pat_part0001')).글).toContain('FORBIDDEN — authoring:read');
    expect((await 도구('run_result', { runId: 내실행 }, 'pat_part0001')).글).toContain('FORBIDDEN — runs:read');
    expect((await 도구('bts_search', { projectId: 내프로젝트, query: '잠금' }, 'pat_part0001')).글).toContain('FORBIDDEN');
    expect(BTS받은것).toHaveLength(0);
  });

  it('실행 결과 보기 — 내 애플리케이션 실행은 화면과 같은 몸, 남의 실행은 FORBIDDEN, 없는 번호는 NOT_FOUND', async () => {
    expect((await 도구('run_result', { runId: 내실행 })).json()).toMatchObject({ runId: 내실행, items: [], itemsTotal: 0 });
    expect((await 도구('run_result', { runId: 남실행 })).글).toContain('FORBIDDEN');
    expect((await 도구('run_result', { runId: 2_000_000_000 })).글).toContain('NOT_FOUND');
  });

  it('BTS 찾기 — 부른 사람의 PAT 로 BTS 를 부르고, 이은 BTS 프로젝트 밖 키 · 배정 밖 프로젝트는 막는다', async () => {
    const 하나 = await 도구('bts_search', { projectId: 내프로젝트, issueKey: 'XMQ-12' });
    expect(하나.json()).toEqual({ key: 'XMQ-12', summary: '로그인 잠금' });
    expect(BTS받은것[0]).toMatchObject({ 열쇠: 'pat_me000001', method: 'GET', 경로: '/api/v1/issues/XMQ-12' });

    await 도구('bts_search', { projectId: 내프로젝트, query: '잠금 "따옴표"' });
    expect(BTS받은것[1]).toMatchObject({ 열쇠: 'pat_me000001', method: 'POST', 경로: '/api/v1/search/aql', 몸: { projectKey: 'XMQ', query: 'text ~ "잠금 \\"따옴표\\""' } });

    expect((await 도구('bts_search', { projectId: 내프로젝트, issueKey: 'XMQ-404' })).글).toContain('NOT_FOUND');
    expect((await 도구('bts_search', { projectId: 내프로젝트, issueKey: 'OTHER-1' })).글).toContain('FORBIDDEN');
    expect((await 도구('bts_search', { projectId: 남프로젝트, query: '잠금' })).글).toContain('FORBIDDEN');
    expect(BTS받은것).toHaveLength(3);
  });

  const 작성줄 = async (앱번호: number, kind: string, sourceId: number | null = null, status = 'RUNNING') =>
    Number(
      (
        await q(
          `INSERT INTO authoring_request (service_id, kind, source_id, requested_by, requested_by_name, status, claimed_by)
           VALUES ($1, $2, $3, 'xmc-me', 'xmc-me', $4, 'xmc-agent') RETURNING id`,
          [앱번호, kind, sourceId, status],
        )
      ).rows[0].id,
    );
  const 열쇠내기 = async (id: number) => {
    const r = (await q('SELECT kind, source_id FROM authoring_request WHERE id = $1', [id])).rows[0] as { kind: string; source_id: string | null };
    return 일열쇠내기({ id, kind: r.kind, sourceId: r.source_id === null ? null : Number(r.source_id) });
  };

  it('일마다 열쇠는 BTS 이은 프로젝트의 작성과 그 재실행만 받는다', async () => {
    const 작성 = await 작성줄(내앱, 'AUTHOR');
    expect(await 열쇠내기(작성)).toMatch(/^mcj_[A-Za-z0-9_-]{43}$/);
    expect(await 열쇠내기(await 작성줄(내앱, 'RERUN', 작성))).toMatch(/^mcj_/);
    expect(await 열쇠내기(await 작성줄(내앱, 'MERGE', 작성))).toBeNull();
    // BTS 를 잇지 않은 프로젝트
    expect(await 열쇠내기(await 작성줄(남앱, 'AUTHOR'))).toBeNull();
    // 도는 줄이 아니면 열쇠를 두지 않는다
    expect(await 열쇠내기(await 작성줄(내앱, 'AUTHOR', null, 'PENDING'))).toBeNull();
  });

  it('일마다 열쇠는 그 프로젝트 조회만 연다 — Auth 에 묻지 않고, BTS 는 「QA Hub AI」 열쇠로 부른다', async () => {
    const 열쇠 = (await 열쇠내기(await 작성줄(내앱, 'AUTHOR')))!;
    expect((await 부르기MCP(열쇠, 'tools/list')).statusCode).toBe(200);
    expect((await 도구('prd_search', { service: 'XMC', query: '잠근다' }, 열쇠)).json()).toMatchObject({ total: 1 });
    // 작성 계정은 남의 프로젝트에도 배정돼 있지만 열쇠는 그 줄의 프로젝트만 본다
    expect((await 도구('prd_search', { service: 'XMCB', query: '' }, 열쇠)).글).toContain('FORBIDDEN');
    expect((await 도구('run_result', { runId: 남실행 }, 열쇠)).글).toContain('FORBIDDEN');
    expect((await 도구('bts_search', { projectId: 남프로젝트, query: '잠금' }, 열쇠)).글).toContain('FORBIDDEN');
    await 도구('bts_search', { projectId: 내프로젝트, issueKey: 'XMQ-12' }, 열쇠);
    expect(BTS받은것).toEqual([expect.objectContaining({ 열쇠: 'bot-key', 경로: '/api/v1/issues/XMQ-12' })]);
    expect(묻기).not.toHaveBeenCalled();
  });

  it('일이 끝나면(RUNNING 이 아니면) · 틀린 열쇠 · 작성 계정이 바뀌면 401', async () => {
    const 줄 = await 작성줄(내앱, 'AUTHOR');
    const 열쇠 = (await 열쇠내기(줄))!;
    vi.stubEnv('AUTHORING_AGENT_USER', 'xmc-other');
    expect((await 부르기MCP(열쇠, 'tools/list')).statusCode).toBe(401);
    vi.stubEnv('AUTHORING_AGENT_USER', 'xmc-agent');
    expect((await 부르기MCP(열쇠, 'tools/list')).statusCode).toBe(200);
    await q(`UPDATE app_user SET is_active = false WHERE username = 'xmc-agent'`);
    expect((await 부르기MCP(열쇠, 'tools/list')).statusCode).toBe(401);
    await q(`UPDATE app_user SET is_active = true WHERE username = 'xmc-agent'`);
    await q(`UPDATE authoring_request SET status = 'DONE' WHERE id = $1`, [줄]);
    expect((await 부르기MCP(열쇠, 'tools/list')).statusCode).toBe(401);
    expect((await 부르기MCP('mcj_wrong', 'tools/list')).statusCode).toBe(401);
  });

  it('세션 없는 창구라 GET · DELETE 는 405', async () => {
    expect((await app.inject({ method: 'GET', url: '/mcp' })).statusCode).toBe(405);
    expect((await app.inject({ method: 'DELETE', url: '/mcp' })).statusCode).toBe(405);
  });
});
