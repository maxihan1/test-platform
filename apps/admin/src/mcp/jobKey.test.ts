// 작성 요청마다 나는 MCP 열쇠 mcj_ — 집기 응답 mcpKey 부터 /mcp 가 그 프로젝트 조회만 여는 것까지 실제 DB 로 본다. BTS 는 가짜다. DATABASE_URL이 있을 때만 돈다

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { 인증등록 } from '../auth/gate.js';
import { 세션등록 } from '../auth/session.js';
import authoringAgentRoutes from '../authoring/agentRoutes.js';
import { 집기되돌리기 } from '../authoring/agentStore.js';
import type { 부르기함수 } from '../bts/client.js';
import { 일열쇠내기 } from './jobKey.js';
import mcpRoutes from './server.js';

const 연결 = process.env.DATABASE_URL;
const 작성계정 = 'xmj-agent';

type 답몸 = { result?: { content: { text: string }[]; isError?: boolean } };

describe.skipIf(연결 === undefined)('MCP 일마다 열쇠 mcj_', () => {
  let 집기앱: FastifyInstance;
  let mcp앱: FastifyInstance;
  let 내프로젝트 = 0;
  let 남프로젝트 = 0;
  let 내앱 = 0;
  let 남앱 = 0;
  let 남실행 = 0;
  const BTS받은것: { 열쇠: string; 경로: string }[] = [];
  const 부르기: 부르기함수 = async (자리, _method, 경로) => {
    BTS받은것.push({ 열쇠: 자리.botKey, 경로 });
    if (경로 === '/api/v1/issues/XMJQ-401') return { status: 401, json: null };
    return { status: 200, json: { data: { key: 'XMJQ-1' } } };
  };

  const q = async (sql: string, 값: unknown[] = []) => (await import('../db/index.js')).pool.query(sql, 값);

  async function 치우기() {
    const 앱들 = (await q(`SELECT id FROM service WHERE prefix IN ('XMJ', 'XMJB')`)).rows.map((r: { id: string }) => Number(r.id));
    await q('DELETE FROM authoring_request WHERE service_id = ANY($1)', [앱들]);
    await q('DELETE FROM test_run WHERE service_id = ANY($1)', [앱들]);
    await q('DELETE FROM prd_version WHERE service_id = ANY($1)', [앱들]);
    await q('DELETE FROM user_project WHERE username = $1', [작성계정]);
    await q('DELETE FROM app_user WHERE username = $1', [작성계정]);
    // 프로젝트는 애플리케이션이 다 지워지면 트리거가 지운다 · bts_link 는 프로젝트와 같이 간다
    await q('DELETE FROM service WHERE id = ANY($1)', [앱들]);
  }

  /** 그 애플리케이션에 PENDING 줄 하나만 남기고 집는다 */
  async function 세우고집기(앱번호: number, prefix: string, kind = 'AUTHOR', sourceId: number | null = null) {
    await q(`UPDATE authoring_request SET status = 'FAILED' WHERE service_id = $1 AND status IN ('PENDING', 'RUNNING')`, [앱번호]);
    const id = Number(
      (
        await q(
          `INSERT INTO authoring_request (service_id, kind, source_id, requested_by, requested_by_name, status)
           VALUES ($1, $2, $3, 'xmj-person', 'xmj-person', 'PENDING') RETURNING id`,
          [앱번호, kind, sourceId],
        )
      ).rows[0].id,
    );
    const res = await 집기앱.inject({ method: 'POST', url: `/api/authoring/requests/claim?service=${prefix}` });
    expect(res.statusCode).toBe(200);
    return { id, 몸: res.json<{ id: number; mcpKey?: string }>() };
  }

  const 부르기MCP = (열쇠: string, method: string, params: unknown = {}) =>
    mcp앱.inject({
      method: 'POST',
      url: '/mcp',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: `Bearer ${열쇠}` },
      payload: { jsonrpc: '2.0', id: 1, method, params },
    });

  const 도구 = async (열쇠: string, name: string, args: Record<string, unknown>) => {
    const res = await 부르기MCP(열쇠, 'tools/call', { name, arguments: args });
    expect(res.statusCode).toBe(200);
    return (res.json() as 답몸).result!.content[0]!.text;
  };

  beforeAll(async () => {
    vi.stubEnv('AUTHORING_AGENT_USER', 작성계정);
    await 치우기();
    내프로젝트 = Number((await q(`INSERT INTO project (name) VALUES ('XMJ 프로젝트') RETURNING id`)).rows[0].id);
    남프로젝트 = Number((await q(`INSERT INTO project (name) VALUES ('XMJ 다른 프로젝트') RETURNING id`)).rows[0].id);
    const 앱 = async (prefix: string, 프로젝트: number) =>
      Number((await q(`INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id) VALUES ($1, $1, '#123456', '', $2, $3) RETURNING id`, [prefix, prefix.toLowerCase(), 프로젝트])).rows[0].id);
    내앱 = await 앱('XMJ', 내프로젝트);
    남앱 = await 앱('XMJB', 남프로젝트);
    await q(
      `INSERT INTO app_user (username, display_name, password_hash, role, perm_dashboard, is_approved, must_change_password, is_active)
       VALUES ($1, $1, NULL, 'member', 'none', true, false, true)`,
      [작성계정],
    );
    // 작성 계정은 두 프로젝트에 다 배정돼 있다 — 열쇠가 그 줄의 프로젝트로 좁히는지 본다
    await q(
      `INSERT INTO user_project (username, project_id, perm_cases, perm_runs, perm_authoring) VALUES ($1, $2, 'write', 'write', 'write'), ($1, $3, 'write', 'write', 'write')`,
      [작성계정, 내프로젝트, 남프로젝트],
    );
    await q(
      `INSERT INTO prd_version (service_id, version, items, last_no, source, saved_by, saved_by_name) VALUES ($1, 1, $2, 1, 'PERSON', 'xmj', 'xmj')`,
      [내앱, JSON.stringify([{ reqId: 'XMJ-REQ-001', feature: '로그인', text: '다섯 번 틀리면 잠근다', basis: [], status: 'CONFIRMED' }])],
    );
    await q(
      `INSERT INTO bts_link (project_id, base_url, bts_project, bot_key, webhook_secret, status_map, resolution_map, updated_by)
       VALUES ($1, 'https://bts.xmj.test', 'XMJQ', 'xmj-bot-key', 's', '{}', '{}', 'xmj')`,
      [내프로젝트],
    );
    남실행 = Number(
      (await q(`INSERT INTO test_run (title, triggered_by, status, env, service_id, service_name, tests_repo, base_url) VALUES ('XMJB', 'xmj', 'FINISHED', 'qa', $1, 'XMJB', '', 'https://qa.xmj.test') RETURNING run_id`, [남앱]))
        .rows[0].run_id,
    );

    집기앱 = Fastify();
    집기앱.decorateRequest('user', null);
    집기앱.addHook('preHandler', async (req) => {
      req.user = { username: 작성계정, displayName: '작성 계정', role: 'member' as const, dashboard: 'none' as const, mustChangePassword: false, services: [] };
    });
    await 집기앱.register(authoringAgentRoutes, { prefix: '/api' });
    await 집기앱.ready();

    mcp앱 = Fastify();
    세션등록(mcp앱, 'xmj-검사용-세션-열쇠-32글자를-넘긴다-넉넉히');
    인증등록(mcp앱);
    await mcp앱.register(mcpRoutes, { 부르기 });
    await mcp앱.ready();
  });

  beforeEach(() => {
    BTS받은것.length = 0;
    vi.stubEnv('AUTHORING_AGENT_USER', 작성계정);
  });

  afterAll(async () => {
    await 집기앱?.close();
    await mcp앱?.close();
    await 치우기();
    vi.unstubAllEnvs();
  });

  it('집기 응답 mcpKey 는 BTS 이은 프로젝트의 작성 · 그 재실행에만 실린다', async () => {
    const 작성 = await 세우고집기(내앱, 'XMJ');
    expect(작성.몸.mcpKey).toMatch(/^mcj_[A-Za-z0-9_-]{43}$/);
    expect((await 세우고집기(내앱, 'XMJ', 'RERUN', 작성.id)).몸.mcpKey).toMatch(/^mcj_/);
    expect('mcpKey' in (await 세우고집기(남앱, 'XMJB')).몸).toBe(false);
    expect(await 일열쇠내기({ id: 작성.id, kind: 'MERGE', sourceId: 작성.id })).toBeNull();
  });

  it('그 프로젝트 조회만 연다 — 작성 계정이 남의 프로젝트에 배정돼 있어도 막고, BTS 는 「QA Hub AI」 열쇠로 부른다', async () => {
    const 열쇠 = (await 세우고집기(내앱, 'XMJ')).몸.mcpKey!;
    expect(await 도구(열쇠, 'prd_search', { service: 'XMJ', query: '잠근다' })).toContain('XMJ-REQ-001');
    expect(await 도구(열쇠, 'prd_search', { service: 'XMJB', query: '' })).toContain('FORBIDDEN');
    expect(await 도구(열쇠, 'run_result', { runId: 남실행 })).toContain('FORBIDDEN');
    expect(await 도구(열쇠, 'bts_search', { projectId: 남프로젝트, query: '잠금' })).toContain('FORBIDDEN');
    await 도구(열쇠, 'bts_search', { projectId: 내프로젝트, issueKey: 'XMJQ-1' });
    expect(BTS받은것).toEqual([{ 열쇠: 'xmj-bot-key', 경로: '/api/v1/issues/XMJQ-1' }]);
    expect(await 도구(열쇠, 'bts_search', { projectId: 내프로젝트, issueKey: 'XMJQ-401' })).toContain('「QA Hub AI」 계정 토큰');
  });

  it('일이 끝나면 · 작성 계정이 바뀌거나 꺼지면 · 틀린 열쇠면 401', async () => {
    const { id, 몸 } = await 세우고집기(내앱, 'XMJ');
    const 열쇠 = 몸.mcpKey!;
    vi.stubEnv('AUTHORING_AGENT_USER', 'xmj-other');
    expect((await 부르기MCP(열쇠, 'tools/list')).statusCode).toBe(401);
    vi.stubEnv('AUTHORING_AGENT_USER', 작성계정);
    await q('UPDATE app_user SET is_active = false WHERE username = $1', [작성계정]);
    expect((await 부르기MCP(열쇠, 'tools/list')).statusCode).toBe(401);
    await q('UPDATE app_user SET is_active = true WHERE username = $1', [작성계정]);
    expect((await 부르기MCP(열쇠, 'tools/list')).statusCode).toBe(200);
    await q(`UPDATE authoring_request SET status = 'DONE' WHERE id = $1`, [id]);
    expect((await 부르기MCP(열쇠, 'tools/list')).statusCode).toBe(401);
    expect((await 부르기MCP('mcj_wrong', 'tools/list')).statusCode).toBe(401);
  });

  it('줄로 되돌리면 그 열쇠는 죽고, 다시 집으면 새 열쇠가 난다', async () => {
    const { id, 몸 } = await 세우고집기(내앱, 'XMJ');
    expect(await 집기되돌리기(id, 작성계정)).toBe(true);
    expect((await q('SELECT mcp_key_hash FROM authoring_request WHERE id = $1', [id])).rows[0].mcp_key_hash).toBeNull();
    const 다시 = await 집기앱.inject({ method: 'POST', url: '/api/authoring/requests/claim?service=XMJ' });
    const 새열쇠 = 다시.json<{ id: number; mcpKey?: string }>().mcpKey!;
    expect(새열쇠).not.toBe(몸.mcpKey);
    expect((await 부르기MCP(몸.mcpKey!, 'tools/list')).statusCode).toBe(401);
    expect((await 부르기MCP(새열쇠, 'tools/list')).statusCode).toBe(200);
  });
});
