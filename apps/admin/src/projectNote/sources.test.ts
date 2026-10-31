// 노트 사건이 서는 곳(BTS 알림 · 규칙 웹훅 · 표준 기획서 새 판)과 MCP note_read 를 실제 DB 로 본다. BTS 는 가짜다. DATABASE_URL이 있을 때만 돈다

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { 토큰해시 } from '../auth/agentToken.js';
import { 인증등록 } from '../auth/gate.js';
import { 세션등록 } from '../auth/session.js';
import { 사용자와해시, type 사용자 } from '../auth/store.js';
import authoringAgentRoutes from '../authoring/agentRoutes.js';
import type { BTS자리 } from '../bts/client.js';
import btsInboundRoutes, { BTS알림처리 } from '../bts/inbound.js';
import { 노트읽기 } from '../mcp/note.js';
import mcpRoutes from '../mcp/server.js';
import { 사람저장 } from '../prd/store.js';
import { 늘있는문서 } from './note.js';

const 연결 = process.env.DATABASE_URL;
const 작성계정 = 'xnr-agent';

describe.skipIf(연결 === undefined)('노트 사건이 서는 곳 · note_read', () => {
  let 집기앱: FastifyInstance;
  let mcp앱: FastifyInstance;
  let 규칙앱: FastifyInstance;
  let 내프로젝트 = 0;
  let 남프로젝트 = 0;
  let 앱 = 0;
  let 이슈 = { key: 'XNS-1', currentStateKey: 'open', typeKey: 'bug', summary: '로그인 잠금', resolution: null as { name: string } | null };
  const 부르기 = async (_자리: BTS자리, _method: string, 경로: string) => ({ status: 200, json: { data: { ...이슈, key: 경로.split('/').pop() } } });
  const q = async (sql: string, 값: unknown[] = []) => (await import('../db/index.js')).pool.query(sql, 값);
  const 연결값 = () => ({ projectId: 내프로젝트, baseUrl: 'https://bts.xnr.test', botKey: 'k', btsProject: 'XNS' });
  const 알림 = (event: string, issueKey: string) => BTS알림처리(연결값(), { event, deliveryId: `${event}-${issueKey}-${String(Math.random())}`, data: { issueKey } }, 부르기);
  const 사건들 = async () =>
    (await q('SELECT kind, payload FROM project_note_event WHERE project_id = $1 ORDER BY id', [내프로젝트])).rows as { kind: string; payload: Record<string, unknown> }[];

  async function 치우기() {
    const 앱들 = (await q(`SELECT id FROM service WHERE prefix IN ('XNR', 'XNRB')`)).rows.map((r: { id: string }) => Number(r.id));
    await q('DELETE FROM authoring_request WHERE service_id = ANY($1)', [앱들]);
    await q('DELETE FROM prd_version WHERE service_id = ANY($1)', [앱들]);
    await q('DELETE FROM user_project WHERE username = $1', [작성계정]);
    await q('DELETE FROM app_user WHERE username = $1', [작성계정]);
    // 프로젝트는 애플리케이션이 다 지워지면 트리거가 지운다 — 노트 · 사건 · 노트 고치기 줄 · bts_link 가 같이 간다
    await q('DELETE FROM service WHERE id = ANY($1)', [앱들]);
  }

  const 도구 = async (열쇠: string, name: string, args: Record<string, unknown>) => {
    const res = await mcp앱.inject({
      method: 'POST',
      url: '/mcp',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: `Bearer ${열쇠}` },
      payload: { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } },
    });
    expect(res.statusCode).toBe(200);
    return (res.json() as { result: { content: { text: string }[] } }).result.content[0]!.text;
  };

  beforeAll(async () => {
    vi.stubEnv('AUTHORING_AGENT_USER', 작성계정);
    await 치우기();
    내프로젝트 = Number((await q(`INSERT INTO project (name) VALUES ('XNR 프로젝트') RETURNING id`)).rows[0].id);
    남프로젝트 = Number((await q(`INSERT INTO project (name) VALUES ('XNR 다른 프로젝트') RETURNING id`)).rows[0].id);
    const 넣기 = async (prefix: string, 프로젝트: number) =>
      Number((await q(`INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id) VALUES ($1, $1, '#123456', '', $2, $3) RETURNING id`, [prefix, prefix.toLowerCase(), 프로젝트])).rows[0].id);
    앱 = await 넣기('XNR', 내프로젝트);
    await 넣기('XNRB', 남프로젝트);
    await q(`INSERT INTO app_user (username, display_name, password_hash, role, perm_dashboard, is_approved, must_change_password) VALUES ($1, $1, NULL, 'member', 'none', true, false)`, [작성계정]);
    await q(`INSERT INTO user_project (username, project_id, perm_cases, perm_runs, perm_authoring) VALUES ($1, $2, 'write', 'write', 'write'), ($1, $3, 'write', 'write', 'write')`, [작성계정, 내프로젝트, 남프로젝트]);
    await q(
      `INSERT INTO bts_link (project_id, base_url, bts_project, bot_key, webhook_secret, status_map, resolution_map, updated_by, rule_token_hash, rule_token_tail, rule_token_by, rule_token_at)
       VALUES ($1, 'https://bts.xnr.test', 'XNS', 'k', 's', '{"CLOSED": "closed"}', '{}', 'xnr', $2, 'rule', $3, now())`,
      [내프로젝트, 토큰해시('btr_xnr-rule'), 작성계정],
    );

    집기앱 = Fastify();
    집기앱.decorateRequest('user', null);
    집기앱.addHook('preHandler', async (req) => {
      req.user = { username: 작성계정, displayName: '작성 계정', role: 'member' as const, dashboard: 'none' as const, mustChangePassword: false, services: [] };
    });
    await 집기앱.register(authoringAgentRoutes, { prefix: '/api' });
    await 집기앱.ready();
    mcp앱 = Fastify();
    세션등록(mcp앱, 'xnr-검사용-세션-열쇠-32글자를-넘긴다-넉넉히');
    인증등록(mcp앱);
    await mcp앱.register(mcpRoutes, {});
    await mcp앱.ready();
    규칙앱 = Fastify();
    await 규칙앱.register(btsInboundRoutes, { prefix: '/api', 부르기 });
    await 규칙앱.ready();
  });

  beforeEach(() => vi.stubEnv('AUTHORING_AGENT_USER', 작성계정));

  afterAll(async () => {
    await 집기앱?.close();
    await mcp앱?.close();
    await 규칙앱?.close();
    await 치우기();
    vi.unstubAllEnvs();
  });

  it('BTS 알림 — 이슈 열림은 ISSUE_OPEN, 「닫힘」으로 옮김은 버그면 ISSUE_CLOSE 그 밖은 TASK_DONE, 다른 상태로 옮김은 안 쌓는다', async () => {
    await 알림('issue.created', 'XNS-1');
    await 알림('issue.transitioned', 'XNS-1');
    이슈 = { ...이슈, currentStateKey: 'closed', resolution: { name: '고침' } };
    await 알림('issue.transitioned', 'XNS-1');
    이슈 = { ...이슈, typeKey: 'task', summary: '쿠폰 화면' };
    await 알림('issue.transitioned', 'XNS-2');
    expect(await 사건들()).toEqual([
      { kind: 'ISSUE_OPEN', payload: { issueKey: 'XNS-1', type: 'bug', summary: '로그인 잠금' } },
      { kind: 'ISSUE_CLOSE', payload: { issueKey: 'XNS-1', type: 'bug', summary: '로그인 잠금', resolution: '고침' } },
      { kind: 'TASK_DONE', payload: { issueKey: 'XNS-2', type: 'task', summary: '쿠폰 화면', resolution: '고침' } },
    ]);
  });

  it('같은 이슈의 열림은 다시 와도 한 번만, 다시 닫으면 닫힘은 또 쌓인다', async () => {
    const 전 = (await 사건들()).length;
    이슈 = { key: 'XNS-1', currentStateKey: 'open', typeKey: 'bug', summary: '로그인 잠금', resolution: null };
    await 알림('issue.created', 'XNS-1');
    이슈 = { ...이슈, currentStateKey: 'closed', resolution: { name: '고침' } };
    await 알림('issue.transitioned', 'XNS-1');
    expect((await 사건들()).slice(전)).toEqual([
      { kind: 'ISSUE_CLOSE', payload: { issueKey: 'XNS-1', type: 'bug', summary: '로그인 잠금', resolution: '고침' } },
    ]);
  });

  it('노트 사건을 못 쌓아도 알림은 처리한 것으로 남는다 — 이슈를 돌려주고, 같은 알림은 다시 안 돌고, 까닭을 서버 기록에 남긴다', async () => {
    const 오류 = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    // jsonb 는 \u0000 을 받지 않는다 — 사건 쓰기만 깨진다
    이슈 = { key: 'XNS-7', currentStateKey: 'open', typeKey: 'bug', summary: '널\u0000글자', resolution: null };
    const 몸 = { event: 'issue.created', deliveryId: 'xnr-널-1', data: { issueKey: 'XNS-7' } };
    try {
      expect(await BTS알림처리(연결값(), 몸, 부르기)).toMatchObject({ key: 'XNS-7' });
      expect(오류.mock.calls.some(([글]) => String(글).includes(`프로젝트 ${String(내프로젝트)} XNS-7 ISSUE_OPEN 노트 사건을 못 쌓았다`))).toBe(true);
      expect(await BTS알림처리(연결값(), 몸, 부르기)).toBeNull();
      expect((await 사건들()).some((e) => e.payload.issueKey === 'XNS-7')).toBe(false);
    } finally {
      오류.mockRestore();
    }
  });

  it('규칙 웹훅 PR 병합은 PR_MERGED 로 같은 PR 은 한 번만, 담당자 변경은 안 쌓는다', async () => {
    const 규칙 = (몸: unknown) => 규칙앱.inject({ method: 'POST', url: '/api/bts/rules', payload: JSON.stringify(몸), headers: { 'content-type': 'application/json', 'x-qahub-token': 'btr_xnr-rule' } });
    // 규칙 토큰은 admin 이 만든 것만 산다
    await q(`UPDATE app_user SET role = 'admin' WHERE username = $1`, [작성계정]);
    expect((await 규칙({ event: 'ASSIGNEE', issueKey: 'XNS-1' })).statusCode).toBe(204);
    expect((await 규칙({ event: 'PR_MERGED', issueKey: 'XNS-1', prNumber: 12, prUrl: 'https://github.com/x/y/pull/12' })).statusCode).toBe(204);
    expect((await 규칙({ event: 'PR_MERGED', issueKey: 'XNS-1', prNumber: 12, prUrl: 'https://github.com/x/y/pull/12' })).statusCode).toBe(204);
    await q(`UPDATE app_user SET role = 'member' WHERE username = $1`, [작성계정]);
    const 병합 = (await 사건들()).filter((e) => e.kind === 'PR_MERGED');
    expect(병합).toEqual([{ kind: 'PR_MERGED', payload: { issueKey: 'XNS-1', prNumber: 12, prUrl: 'https://github.com/x/y/pull/12', prTitle: '' } }]);
  });

  it('표준 기획서 새 판은 PRD_VERSION — BTS 안 이은 프로젝트의 판은 안 쌓는다', async () => {
    const 항목 = { feature: '로그인', text: '다섯 번 틀리면 잠근다', basis: [{ from: '기획서.docx', quote: '잠근다' }], status: 'CONFIRMED' as const };
    await 사람저장(앱, 'XNR', 0, [항목], { username: 'xnr', displayName: '검사' });
    expect((await 사건들()).at(-1)).toEqual({ kind: 'PRD_VERSION', payload: { service: 'XNR', version: 1 } });
    expect((await q('SELECT count(*) AS n FROM project_note_event WHERE project_id = $1', [남프로젝트])).rows[0].n).toBe('0');
  });

  it('노트 고치기에 일마다 열쇠가 나고, 그 열쇠로 그 프로젝트 노트만 읽는다 — 목차 · 문서 · 없는 이름 · 남의 프로젝트', async () => {
    const 열린 = (await q(`SELECT id FROM authoring_request WHERE project_id = $1 AND status = 'PENDING'`, [내프로젝트])).rows;
    expect(열린).toHaveLength(1);
    const 집음 = await 집기앱.inject({ method: 'POST', url: '/api/authoring/requests/claim?service=XNR' });
    const 몸 = 집음.json<{ id: number; kind: string; mcpKey?: string }>();
    expect(몸).toMatchObject({ id: Number(열린[0].id), kind: 'NOTE' });
    const 열쇠 = 몸.mcpKey!;
    expect(열쇠).toMatch(/^mcj_/);

    expect(await 도구(열쇠, 'note_read', { projectId: 내프로젝트 })).toContain('NOT_FOUND');
    const docs = [...늘있는문서.map((name) => ({ name, summary: `${name} 요약`, body: `- ${name}` })), { name: '쿠폰', summary: '쿠폰 기능', body: '- 쿠폰은 한 번만' }];
    await q('INSERT INTO project_note (project_id, version, docs, request_id) VALUES ($1, 1, $2, $3)', [내프로젝트, JSON.stringify(docs), 몸.id]);

    const 목차 = JSON.parse(await 도구(열쇠, 'note_read', { projectId: 내프로젝트 })) as { version: number; savedAt: string; docs: unknown[] };
    expect(목차.version).toBe(1);
    expect(목차.docs).toHaveLength(6);
    expect(목차.docs[5]).toEqual({ name: '쿠폰', summary: '쿠폰 기능', length: '- 쿠폰은 한 번만'.length });
    expect(JSON.parse(await 도구(열쇠, 'note_read', { projectId: 내프로젝트, name: '쿠폰' }))).toMatchObject({ version: 1, name: '쿠폰', summary: '쿠폰 기능', body: '- 쿠폰은 한 번만' });
    expect(await 도구(열쇠, 'note_read', { projectId: 내프로젝트, name: '결제' })).toContain('NOT_FOUND');
    // 작성 계정이 남의 프로젝트에도 배정돼 있어도 열쇠는 그 줄의 프로젝트로 좁힌다
    expect(await 도구(열쇠, 'note_read', { projectId: 남프로젝트 })).toContain('FORBIDDEN');
  });

  it('BTS 를 안 이은 프로젝트는 NOT_LINKED, 작성 read 가 없으면 FORBIDDEN', async () => {
    const 찾은 = (await 사용자와해시(작성계정))!;
    const 누구 = (perm: 'read' | 'none'): 사용자 => ({
      ...찾은.user,
      mustChangePassword: false,
      services: 찾은.user.services.map((s) => ({ ...s, permissions: { ...s.permissions, authoring: perm } })),
    });
    expect(await 노트읽기(누구('read'), 남프로젝트)).toMatchObject({ ok: false, error: 'NOT_LINKED' });
    expect(await 노트읽기(누구('none'), 남프로젝트)).toMatchObject({ ok: false, error: 'FORBIDDEN' });
  });
});
