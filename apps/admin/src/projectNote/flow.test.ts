// 프로젝트 노트 고치기 한 바퀴 — 사건 쌓기 · 집기 note 칸 · 결과 통로 · 문의 프로젝트 경계 · 사람 다시 실행 막기를 진짜 문과 DB 로 본다. DATABASE_URL이 있을 때만 돈다

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { 에이전트토큰만들기 } from '../auth/agentToken.js';
import { 인증등록 } from '../auth/gate.js';
import { 해시 } from '../auth/password.js';
import authRoutes from '../auth/routes.js';
import { 세션등록 } from '../auth/session.js';
import authoringAgentRoutes from '../authoring/agentRoutes.js';
import { 집기되돌리기 } from '../authoring/agentStore.js';
import authoringRoutes from '../authoring/routes.js';
import { 노트사건쌓기 } from './events.js';
import { 늘있는문서, 노트상한 } from './note.js';
import projectNoteRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 맥 = 'xno-agent';
const 남맥 = 'xno-agent2';
const 사람 = 'xno-person';
const 계정들 = [맥, 남맥, 사람];
const 다섯 = 늘있는문서.map((name) => ({ name, summary: `${name} 요약`, body: `- ${name} 첫 줄` }));

type 집은몸 = { id: number; kind: string; serviceId: number | null; projectId: number | null; mcpKey?: string; note?: { project: { id: number; btsProject: string }; services: { prefix: string }[]; current: unknown; events: { id: number; kind: string; payload: Record<string, unknown> }[] } };

describe.skipIf(연결 === undefined)('프로젝트 노트 고치기', () => {
  let app: FastifyInstance;
  let 내프로젝트 = 0;
  let 남프로젝트 = 0;
  let 앱 = 0;
  let 토큰 = '';
  let 남토큰 = '';
  let 사람쿠키 = '';
  const q = async (sql: string, 값: unknown[] = []) => (await import('../db/index.js')).pool.query(sql, 값);

  async function 치우기() {
    const 앱들 = (await q(`SELECT id FROM service WHERE prefix IN ('XNO', 'XNO2', 'XNOB')`)).rows.map((r: { id: string }) => Number(r.id));
    await q('DELETE FROM authoring_request WHERE service_id = ANY($1)', [앱들]);
    await q('DELETE FROM user_project WHERE username = ANY($1)', [계정들]);
    await q('DELETE FROM app_user WHERE username = ANY($1)', [계정들]);
    // 프로젝트는 애플리케이션이 다 지워지면 트리거가 지운다 — 노트 · 사건 · 노트 고치기 줄 · bts_link 가 같이 간다
    await q('DELETE FROM service WHERE id = ANY($1)', [앱들]);
  }

  const 부르기 = (method: 'GET' | 'POST' | 'PATCH', url: string, payload?: object, 열쇠 = 토큰) =>
    app.inject({ method, url, headers: { authorization: `Bearer ${열쇠}` }, ...(payload !== undefined && { payload }) });
  const 집기 = async (prefix: string) => {
    const res = await 부르기('POST', `/api/authoring/requests/claim?service=${prefix}`);
    return res.statusCode === 204 ? null : res.json<집은몸>();
  };
  const 열린노트 = async () =>
    (await q(`SELECT id, status FROM authoring_request WHERE project_id = $1 AND status IN ('PENDING', 'RUNNING')`, [내프로젝트])).rows as { id: string; status: string }[];
  const 노트보내기 = (id: number, 몸: object, 열쇠 = 토큰) => 부르기('POST', `/api/authoring/requests/${String(id)}/note`, 몸, 열쇠);
  const 끝내기 = (id: number, 몸: object) => 부르기('POST', `/api/authoring/requests/${String(id)}/finish?service=XNO2`, 몸);

  beforeAll(async () => {
    vi.stubEnv('AUTHORING_AGENT_USER', 맥);
    await 치우기();
    내프로젝트 = Number((await q(`INSERT INTO project (name) VALUES ('XNO 프로젝트') RETURNING id`)).rows[0].id);
    남프로젝트 = Number((await q(`INSERT INTO project (name) VALUES ('XNO 다른 프로젝트') RETURNING id`)).rows[0].id);
    const 넣기 = async (prefix: string, 프로젝트: number) =>
      Number((await q(`INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id) VALUES ($1, $1, '#123456', 'https://github.com/x/xno', $2, $3) RETURNING id`, [prefix, prefix.toLowerCase(), 프로젝트])).rows[0].id);
    앱 = await 넣기('XNO', 내프로젝트);
    await 넣기('XNO2', 내프로젝트);
    await 넣기('XNOB', 남프로젝트);
    for (const 이름 of 계정들) {
      await q(
        `INSERT INTO app_user (username, display_name, password_hash, role, perm_dashboard, is_approved, must_change_password) VALUES ($1, $1, $2, 'member', 'none', true, false)`,
        [이름, await 해시('열려라참깨')],
      );
    }
    await q(`INSERT INTO user_project (username, project_id, perm_cases, perm_runs, perm_authoring) VALUES ($1, $2, 'none', 'none', 'write'), ($3, $4, 'none', 'none', 'write'), ($5, $2, 'write', 'write', 'write')`, [맥, 내프로젝트, 남맥, 남프로젝트, 사람]);
    await q(
      `INSERT INTO bts_link (project_id, base_url, bts_project, bot_key, webhook_secret, status_map, resolution_map, updated_by) VALUES ($1, 'https://bts.xno.test', 'XNQ', 'k', 's', '{}', '{}', $2)`,
      [내프로젝트, 사람],
    );
    토큰 = (await 에이전트토큰만들기(맥) as { 토큰: string }).토큰;
    vi.stubEnv('AUTHORING_AGENT_USER', 남맥);
    남토큰 = (await 에이전트토큰만들기(남맥) as { 토큰: string }).토큰;
    vi.stubEnv('AUTHORING_AGENT_USER', 맥);

    app = Fastify();
    세션등록(app, 'xno-검사용-세션-열쇠-32글자를-넘긴다-넉넉히');
    인증등록(app);
    await app.register(authRoutes, { prefix: '/api' });
    await app.register(authoringRoutes, { prefix: '/api' });
    await app.register(authoringAgentRoutes, { prefix: '/api' });
    await app.register(projectNoteRoutes, { prefix: '/api' });
    await app.ready();
    const 로그인 = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 사람, password: '열려라참깨' } });
    사람쿠키 = (로그인.headers['set-cookie'] as string).split(';')[0]!;
  });

  afterAll(async () => {
    await app?.close();
    await 치우기();
    vi.unstubAllEnvs();
  });

  it('BTS 를 이은 프로젝트에만 사건이 쌓이고, 사건이 둘 와도 열린 노트 고치기는 하나다', async () => {
    expect(await 노트사건쌓기(남프로젝트, 'ISSUE_OPEN', { issueKey: 'X-1' })).toBe(false);
    expect((await q('SELECT count(*) AS n FROM authoring_request WHERE project_id = $1', [남프로젝트])).rows[0].n).toBe('0');
    expect(await 노트사건쌓기(내프로젝트, 'ISSUE_OPEN', { issueKey: 'XNQ-1', type: 'bug', summary: '로그인 잠금' })).toBe(true);
    expect(await 노트사건쌓기(내프로젝트, 'PR_MERGED', { issueKey: 'XNQ-1', prNumber: 7, prUrl: 'https://github.com/x/y/pull/7', prTitle: '잠금 고침' })).toBe(true);
    const 열린 = await 열린노트();
    expect(열린).toHaveLength(1);
    const 줄 = (await q('SELECT kind, service_id, requested_by, requested_by_name FROM authoring_request WHERE id = $1', [열린[0]!.id])).rows[0];
    expect(줄).toEqual({ kind: 'NOTE', service_id: null, requested_by: 사람, requested_by_name: `BTS · ${사람}` });
  });

  it('프로젝트 안 어느 애플리케이션 집기에서나 한 번만 집히고, 반영 안 된 사건을 묶어 note 칸에 싣는다', async () => {
    const 집은 = (await 집기('XNO2'))!;
    expect(집은).toMatchObject({ kind: 'NOTE', serviceId: null, projectId: 내프로젝트 });
    expect(집은.mcpKey).toMatch(/^mcj_/);
    expect(집은.note!.project).toMatchObject({ id: 내프로젝트, btsProject: 'XNQ' });
    expect(집은.note!.services.map((s) => s.prefix)).toEqual(['XNO', 'XNO2']);
    expect(집은.note!.current).toBeNull();
    expect(집은.note!.events.map((e) => e.kind)).toEqual(['ISSUE_OPEN', 'PR_MERGED']);
    expect(집은.note!.events[1]!.payload).toEqual({ issueKey: 'XNQ-1', prNumber: 7, prUrl: 'https://github.com/x/y/pull/7', prTitle: '잠금 고침' });
    expect(await 집기('XNO')).toBeNull();
    expect(await 집기('XNO2')).toBeNull();
  });

  it('도는 노트 줄의 단계 · 토큰 사용량은 집은 애플리케이션 ?service= 로 문을 지난다', async () => {
    const id = Number((await 열린노트())[0]!.id);
    expect((await 부르기('PATCH', `/api/authoring/requests/${String(id)}/stage?service=XNO2`, { stage: '노트 고치는 중' })).statusCode).toBe(200);
    expect((await 부르기('POST', `/api/authoring/requests/${String(id)}/usage?service=XNO2`, { input: 1, output: 2, cacheRead: 0, cacheWrite: 0, partial: false })).statusCode).toBe(200);
  });

  it('결과 통로 — 꼴 · 상한은 400 으로 앞 판을 남기고, 맞으면 앞 판에 겹쳐 새 판을 만든다', async () => {
    const id = Number((await 열린노트())[0]!.id);
    expect((await 노트보내기(id, { docs: [{ name: '한눈에' }] })).json()).toMatchObject({ error: 'BAD_NOTE' });
    expect((await 노트보내기(id, { docs: 다섯.slice(1) })).json()).toMatchObject({ error: 'BAD_NOTE' });
    const 김 = await 노트보내기(id, { docs: [...다섯.slice(1), { name: '한눈에', summary: '', body: 'x'.repeat(노트상한.본문 + 1) }] });
    expect(김.statusCode).toBe(400);
    expect(김.json()).toMatchObject({ error: 'NOTE_TOO_LONG' });
    expect((await q('SELECT count(*) AS n FROM project_note WHERE project_id = $1', [내프로젝트])).rows[0].n).toBe('0');

    const 첫 = await 노트보내기(id, { docs: [...다섯, { name: '쿠폰', summary: '쿠폰 기능', body: '- 쿠폰' }] });
    expect(첫.statusCode).toBe(201);
    expect(첫.json()).toEqual({ version: 1 });
    const 둘 = await 노트보내기(id, { docs: [{ name: '한눈에', summary: '새 요약', body: '- 새 줄' }], remove: ['쿠폰'] });
    expect(둘.json()).toEqual({ version: 2 });
    const 판 = (await q('SELECT docs, request_id FROM project_note WHERE project_id = $1 AND version = 2', [내프로젝트])).rows[0];
    expect(판.request_id).toBe(String(id));
    expect(판.docs.map((d: { name: string }) => d.name)).toEqual([...늘있는문서]);
    expect(판.docs[0]).toEqual({ name: '한눈에', summary: '새 요약', body: '- 새 줄' });
  });

  it('남의 프로젝트에만 배정된 작성 계정은 문에서 막히고, 같은 계정이어도 집지 않았으면 NOT_CLAIMER', async () => {
    const id = Number((await 열린노트())[0]!.id);
    vi.stubEnv('AUTHORING_AGENT_USER', 남맥);
    const 막힘 = await 노트보내기(id, { docs: [] }, 남토큰);
    expect(막힘.statusCode).toBe(403);
    expect(막힘.json()).toMatchObject({ error: 'SERVICE_FORBIDDEN' });
    expect((await 부르기('PATCH', `/api/authoring/requests/${String(id)}/stage?service=XNOB`, { stage: 'x' }, 남토큰)).statusCode).toBe(403);
    vi.stubEnv('AUTHORING_AGENT_USER', 맥);
  });

  it('withNote=1 을 붙인 RUNNING 목록에만 노트 줄이 실려 켤 때 닫기가 찾는다', async () => {
    const id = Number((await 열린노트())[0]!.id);
    const 목록 = async (질의: string) => (await 부르기('GET', `/api/authoring/requests?service=XNO${질의}`)).json<{ items: { id: number; claimedBy: string }[] }>().items;
    expect((await 목록('&status=RUNNING&withNote=1')).find((x) => x.id === id)).toMatchObject({ claimedBy: 맥 });
    expect((await 목록('&status=RUNNING')).some((x) => x.id === id)).toBe(false);
    expect((await 목록('')).some((x) => x.id === id)).toBe(false);
  });

  it('사람은 노트 줄을 다시 돌리지 못한다 — 400 BAD_KIND', async () => {
    const id = Number((await 열린노트())[0]!.id);
    const res = await app.inject({ method: 'POST', url: '/api/authoring/requests?service=XNO', headers: { cookie: 사람쿠키 }, payload: { kind: 'RERUN', sourceId: id } });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: 'BAD_KIND' });
  });

  it('끝나면 결과 통로는 409, 도는 동안 들어온 사건은 다음 노트 고치기가 받는다', async () => {
    const id = Number((await 열린노트())[0]!.id);
    await 노트사건쌓기(내프로젝트, 'TASK_DONE', { issueKey: 'XNQ-2' });
    expect((await 끝내기(id, { status: 'DONE' })).statusCode).toBe(200);
    expect((await 노트보내기(id, { docs: [] })).statusCode).toBe(409);
    const 다음 = (await 집기('XNO'))!;
    expect(다음.id).not.toBe(id);
    expect(다음.note!.current).toMatchObject({ version: 2 });
    expect(다음.note!.events.map((e) => e.kind)).toEqual(['TASK_DONE']);
  });

  it('에이전트가 꺼져 멈추면 받은 사건으로 다음 노트 고치기가 바로 서고, 되돌린 집기는 같은 사건을 다시 받는다', async () => {
    const 앞 = Number((await 열린노트())[0]!.id);
    expect((await 끝내기(앞, { status: 'STOPPED', stopReason: 'AGENT_RESTART' })).statusCode).toBe(200);
    const 선 = await 열린노트();
    expect(선).toHaveLength(1);
    expect(Number(선[0]!.id)).not.toBe(앞);
    await 노트사건쌓기(내프로젝트, 'ISSUE_CLOSE', { issueKey: 'XNQ-1' });
    const 다시 = (await 집기('XNO2'))!;
    expect(다시.note!.events.map((e) => e.kind)).toEqual(['TASK_DONE', 'ISSUE_CLOSE']);
    expect(await 집기되돌리기(다시.id, 맥)).toBe(true);
    expect((await 집기('XNO'))!.note!.events.map((e) => e.kind)).toEqual(['TASK_DONE', 'ISSUE_CLOSE']);
  });

  it('실패로 끝나면 다음 사건이 올 때까지 다음 노트 고치기를 세우지 않는다', async () => {
    const 앞 = Number((await 열린노트())[0]!.id);
    expect((await 끝내기(앞, { status: 'FAILED', error: '검사 끝' })).statusCode).toBe(200);
    expect(await 열린노트()).toHaveLength(0);
  });

  it('노트 밖 작성이 DONE 으로 끝나면 AUTHORING_DONE 사건이 쌓인다', async () => {
    const id = Number(
      (await q(`INSERT INTO authoring_request (service_id, kind, spec_text, requested_by, requested_by_name, status) VALUES ($1, 'AUTHOR', 'x', $2, $2, 'PENDING') RETURNING id`, [앱, 사람])).rows[0].id,
    );
    expect((await 집기('XNO'))!.id).toBe(id);
    expect((await 부르기('POST', `/api/authoring/requests/${String(id)}/finish?service=XNO`, { status: 'DONE' })).statusCode).toBe(200);
    const 사건 = (await q(`SELECT payload FROM project_note_event WHERE project_id = $1 AND kind = 'AUTHORING_DONE'`, [내프로젝트])).rows;
    expect(사건.map((r: { payload: unknown }) => r.payload)).toEqual([{ requestId: id, service: 'XNO', kind: 'AUTHOR' }]);
    expect(await 열린노트()).toHaveLength(1);
  });

  it('판을 남긴 뒤 실패한 일의 사건은 반영된 것이라 다음 일이 다시 받지 않는다', async () => {
    const 집은 = (await 집기('XNO'))!;
    expect(집은.note!.events.map((e) => e.kind)).toEqual(['TASK_DONE', 'ISSUE_CLOSE', 'AUTHORING_DONE']);
    expect((await 노트보내기(집은.id, { docs: [{ name: '한눈에', summary: '셋째 판', body: '- 셋째' }] })).statusCode).toBe(201);
    expect((await 끝내기(집은.id, { status: 'FAILED', error: '판 뒤 실패' })).statusCode).toBe(200);
    await 노트사건쌓기(내프로젝트, 'ISSUE_OPEN', { issueKey: 'XNQ-9' });
    const 다음 = (await 집기('XNO'))!;
    expect(다음.note!.current).toMatchObject({ version: 3 });
    expect(다음.note!.events.map((e) => e.kind)).toEqual(['ISSUE_OPEN']);
    expect((await 끝내기(다음.id, { status: 'DONE' })).statusCode).toBe(200);
  });
});
