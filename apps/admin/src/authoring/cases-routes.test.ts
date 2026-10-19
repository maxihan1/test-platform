// 끝내기가 만든 케이스(result.cases)를 검사해 싣고 상세가 그대로 내는지 (SPEC 도메인/작성 §7 finish · 상세)

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import authoringAgentRoutes from './agentRoutes.js';
import authoringRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XWC';
const 맥 = 'xwc-맥';

const 케이스 = {
  tcId: 'XWC-FN-001',
  name: '로그인한다',
  file: 'tests/xwc/login.spec.ts',
  change: 'NEW',
  verifies: ['로그인된다', '이름이 보인다'],
  reqs: ['XWC-REQ-001'],
};

describe.skipIf(연결 === undefined)('만든 케이스 — 끝내기와 상세', () => {
  let app: FastifyInstance;
  let 서비스 = 0;
  let 원본 = 0;

  const 넣기 = async (종류: 'AUTHOR' | 'RERUN' | 'MERGE' | 'EDIT' = 'AUTHOR', params: object = {}): Promise<number> => {
    const { pool } = await import('../db/index.js');
    const 원본필요 = 종류 === 'RERUN' || 종류 === 'MERGE';
    const r = await pool.query<{ id: string }>(
      `INSERT INTO authoring_request (service_id, kind, source_id, params, requested_by, requested_by_name, status, claimed_by, started_at)
       VALUES ($1, $2, $3, $4, 'xwc1', '요청자', 'RUNNING', $5, now()) RETURNING id`,
      [서비스, 종류, 원본필요 ? 원본 : null, JSON.stringify(params), 맥],
    );
    return Number(r.rows[0]!.id);
  };
  const 끝내기 = (id: number, 본문: object) =>
    app.inject({ method: 'POST', url: `/api/authoring/requests/${id}/finish`, payload: 본문 });
  const 상세 = async (id: number) =>
    (await app.inject({ method: 'GET', url: `/api/authoring/requests/${id}` })).json() as { cases: unknown };
  const 상태 = async (id: number): Promise<string> => {
    const { pool } = await import('../db/index.js');
    return ((await pool.query<{ status: string }>('SELECT status FROM authoring_request WHERE id = $1', [id])).rows[0] ?? { status: '' }).status;
  };

  beforeAll(async () => {
    const { pool } = await import('../db/index.js');
    const r = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, 'XWC 만든 케이스 검사용', '#3A5FCD', 'https://github.com/acme/xwc', 'xwc')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true RETURNING id`,
      [접두사],
    );
    서비스 = Number(r.rows[0]!.id);
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    const 원본행 = await pool.query<{ id: string }>(
      `INSERT INTO authoring_request (service_id, kind, requested_by, requested_by_name, status)
       VALUES ($1, 'AUTHOR', 'xwc1', '요청자', 'DONE') RETURNING id`,
      [서비스],
    );
    원본 = Number(원본행.rows[0]!.id);
    process.env.AUTHORING_AGENT_USER = 맥;
    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = { username: 맥, displayName: 맥, role: 'member', dashboard: 'read', mustChangePassword: false, services: [] };
    });
    await app.register(authoringRoutes, { prefix: '/api' });
    await app.register(authoringAgentRoutes, { prefix: '/api' });
    await app.ready();
  });

  afterAll(async () => {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
    await app.close();
  });

  it('작성 DONE 에 실으면 200 이고 상세가 그대로 낸다', async () => {
    const id = await 넣기();
    expect((await 끝내기(id, { status: 'DONE', result: { cases: [케이스] } })).statusCode).toBe(200);
    expect((await 상세(id)).cases).toEqual([케이스]);
  });

  it('재작성(RERUN)의 DONE 에도 실린다', async () => {
    const id = await 넣기('RERUN');
    expect((await 끝내기(id, { status: 'DONE', result: { cases: [케이스] } })).statusCode).toBe(200);
  });

  it('안 실으면 상세의 cases 는 null 이다', async () => {
    const id = await 넣기();
    expect((await 끝내기(id, { status: 'DONE', result: {} })).statusCode).toBe(200);
    expect((await 상세(id)).cases).toBeNull();
  });

  it('모양이 틀리면 400 BAD_CASES 이고 행은 도는 중 그대로다', async () => {
    const id = await 넣기();
    const 틀림 = { ...케이스, change: 'DELETED' };
    const res = await 끝내기(id, { status: 'DONE', result: { cases: [틀림] } });
    expect([res.statusCode, res.json()]).toEqual([400, { error: 'BAD_CASES' }]);
    expect(await 상태(id)).toBe('RUNNING');
  });

  it('상한을 넘거나 같은 tcId 가 두 줄이면 400 BAD_CASES 다', async () => {
    const id = await 넣기();
    const 긴글 = { ...케이스, name: '가'.repeat(301) };
    expect((await 끝내기(id, { status: 'DONE', result: { cases: [긴글] } })).json()).toEqual({ error: 'BAD_CASES' });
    expect((await 끝내기(id, { status: 'DONE', result: { cases: [케이스, 케이스] } })).json()).toEqual({ error: 'BAD_CASES' });
  });

  it('반영(MERGE) · 케이스 고치기(EDIT) · 고치기를 다시 적용한 RERUN 에 실으면 400 BAD_CASES 다', async () => {
    for (const id of [await 넣기('MERGE'), await 넣기('EDIT'), await 넣기('RERUN', { edits: [] })]) {
      const res = await 끝내기(id, { status: 'DONE', result: { cases: [케이스] } });
      expect([res.statusCode, res.json()]).toEqual([400, { error: 'BAD_CASES' }]);
      expect(await 상태(id)).toBe('RUNNING');
    }
  });

  it('실패 · 멈춤에 실으면 400 BAD_CASES 다', async () => {
    const 실패 = await 넣기();
    expect((await 끝내기(실패, { status: 'FAILED', error: '못 했다', result: { cases: [케이스] } })).json()).toEqual({ error: 'BAD_CASES' });
    const 멈춤 = await 넣기();
    const res = await 끝내기(멈춤, { status: 'STOPPED', stopReason: 'CRASH', result: { cases: [케이스] } });
    expect([res.statusCode, res.json()]).toEqual([400, { error: 'BAD_CASES' }]);
  });
});
