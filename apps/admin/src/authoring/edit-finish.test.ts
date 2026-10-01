// 케이스 고치기 집기 · 반영 끝내기의 저장값 지우기 검사 (SPEC 도메인/작성 §3.6 「★ 케이스 고치기」 저장값 · §7 집기 · 끝내기)

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import authoringAgentRoutes from './agentRoutes.js';
import authoringRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XEC';
const 맥 = 'xec-맥';
const 케이스번호들 = ['XEC-001', 'XEC-002', 'XEC-003', 'XEC-004'];
const 못받음 = 'main 을 못 받아 와 저장값을 안 지웠다';

const edits = [
  { tcId: 'XEC-001', expected: { title: '새 제목' } },
  { tcId: 'XEC-002', expected: { total: 5 }, confirm: true },
  { tcId: 'XEC-003', expected: { note: '새 메모' } },
  { tcId: 'XEC-004', delete: true },
];
const 처음저장값: Record<string, { params: object; expected: object }> = {
  'XEC-001': { params: {}, expected: { title: '옛 제목', total: 1 } },
  'XEC-002': { params: { wait: 3 }, expected: { total: 2 } },
  'XEC-003': { params: {}, expected: { note: '옛 메모' } },
  'XEC-004': { params: {}, expected: { title: '지울 케이스' } },
};

describe.skipIf(연결 === undefined)('케이스 고치기 — 집기 · 반영 끝내기', () => {
  let app: FastifyInstance;
  let 서비스 = 0;

  const pool = async () => (await import('../db/index.js')).pool;
  const 행넣기 = async (칸: Record<string, unknown>): Promise<number> => {
    const 이름들 = Object.keys(칸);
    const q = await (await pool()).query<{ id: string }>(
      `INSERT INTO authoring_request (service_id, requested_by, requested_by_name, ${이름들.join(', ')})
       VALUES ($1, 'xec-writer', '고치기 끝내기 검사', ${이름들.map((_, i) => `$${String(i + 2)}`).join(', ')}) RETURNING id`,
      [서비스, ...이름들.map((k) => 칸[k])],
    );
    return Number(q.rows[0]!.id);
  };
  const 도는머지 = async (원본칸: Record<string, unknown>): Promise<number> => {
    const 원본 = await 행넣기({ status: 'DONE', pr_url: 'https://github.com/acme/xec/pull/3', ...원본칸 });
    return 행넣기({ kind: 'MERGE', source_id: 원본, status: 'RUNNING', claimed_by: 맥, started_at: new Date() });
  };
  const 끝내기 = (id: number, 본문: object) =>
    app.inject({ method: 'POST', url: `/api/authoring/requests/${String(id)}/finish`, payload: 본문 });
  const 저장값들 = async () => {
    const r = await (await pool()).query<{ tc_id: string; params: object; expected: object }>(
      'SELECT tc_id, params, expected FROM case_input WHERE tc_id = ANY($1::text[]) ORDER BY tc_id',
      [케이스번호들],
    );
    return Object.fromEntries(r.rows.map((x) => [x.tc_id, { params: x.params, expected: x.expected }]));
  };
  const 읽기 = async (id: number) =>
    (await (await pool()).query('SELECT status, error FROM authoring_request WHERE id = $1', [id])).rows[0];

  beforeAll(async () => {
    const p = await pool();
    const r = await p.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, 'XEC 고치기 끝내기 검사용', '#3A5FCD', 'https://github.com/acme/xec', 'xec')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true RETURNING id`,
      [접두사],
    );
    서비스 = Number(r.rows[0]!.id);
    await p.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    for (const tcId of 케이스번호들) {
      await p.query(
        `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema)
         VALUES ($1, 'XEC 고치기', '["desktop"]', '[]', 'xec/a.spec.ts', $2, $3)
         ON CONFLICT (tc_id) DO NOTHING`,
        [
          tcId,
          JSON.stringify({ type: 'object', properties: { wait: { type: 'number' } } }),
          JSON.stringify({
            type: 'object',
            properties: { title: { type: 'string' }, total: { type: 'number' }, note: { type: 'string' } },
          }),
        ],
      );
    }
    process.env.AUTHORING_AGENT_USER = 맥;
    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = { username: 맥, displayName: '작성 에이전트', role: 'member', dashboard: 'read', mustChangePassword: false, services: [] };
    });
    await app.register(authoringRoutes, { prefix: '/api' });
    await app.register(authoringAgentRoutes, { prefix: '/api' });
    await app.ready();
  });

  beforeEach(async () => {
    const p = await pool();
    await p.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await p.query('DELETE FROM case_input WHERE tc_id = ANY($1::text[])', [케이스번호들]);
    for (const [tcId, 값] of Object.entries(처음저장값)) {
      await p.query(`INSERT INTO case_input (tc_id, params, expected, saved_by) VALUES ($1, $2, $3, 'xec-writer')`, [
        tcId,
        JSON.stringify(값.params),
        JSON.stringify(값.expected),
      ]);
    }
  });

  afterAll(async () => {
    const p = await pool();
    await p.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await p.query('DELETE FROM case_input WHERE tc_id = ANY($1::text[])', [케이스번호들]);
    await p.query('DELETE FROM test_case WHERE tc_id = ANY($1::text[])', [케이스번호들]);
    await p.query('DELETE FROM service WHERE id = $1', [서비스]);
    await app.close();
  });

  describe('집기', () => {
    it('고치기 실행을 집으면 edits 를 행의 params.edits 그대로 싣는다', async () => {
      await 행넣기({ kind: 'EDIT', status: 'PENDING', params: JSON.stringify({ edits }) });
      const res = await app.inject({ method: 'POST', url: `/api/authoring/requests/claim?service=${접두사}` });
      expect(res.statusCode, res.body).toBe(200);
      expect((res.json() as { kind: string; edits: unknown }).edits).toEqual(edits);
    });

    it('고치기 실행이 아니면 edits 키 자체가 없다', async () => {
      await 행넣기({ kind: 'AUTHOR', status: 'PENDING', spec_text: '기획서' });
      const res = await app.inject({ method: 'POST', url: `/api/authoring/requests/claim?service=${접두사}` });
      expect(res.statusCode, res.body).toBe(200);
      expect('edits' in (res.json() as object)).toBe(false);
    });
  });

  describe('반영 끝내기 — 저장값', () => {
    it('main 을 받아 온 반영이 DONE 이면 바꾼 기대값 칸만 지운다 · 빈 행은 없어진다 · 삭제 케이스는 남는다', async () => {
      const 머지 = await 도는머지({ kind: 'EDIT', params: JSON.stringify({ edits }) });
      const res = await 끝내기(머지, { status: 'DONE', result: { pulled: true } });
      expect(res.statusCode, res.body).toBe(200);
      expect(await 저장값들()).toEqual({
        'XEC-001': { params: {}, expected: { total: 1 } },
        'XEC-002': { params: { wait: 3 }, expected: {} },
        'XEC-004': 처음저장값['XEC-004'],
      });
      expect(await 읽기(머지)).toEqual({ status: 'DONE', error: null });
    });

    it('원본이 다시 적용 행이어도 지운다', async () => {
      const 뿌리 = await 행넣기({ kind: 'EDIT', status: 'FAILED', params: JSON.stringify({ edits }) });
      const 머지 = await 도는머지({ kind: 'RERUN', source_id: 뿌리, params: JSON.stringify({ edits: [edits[0]] }) });
      expect((await 끝내기(머지, { status: 'DONE', result: { pulled: true } })).statusCode).toBe(200);
      const 지금 = await 저장값들();
      expect(지금['XEC-001']).toEqual({ params: {}, expected: { total: 1 } });
      expect(지금['XEC-003']).toEqual(처음저장값['XEC-003']);
    });

    it('main 을 못 받아 왔으면(pulled: false) 안 지우고 DONE 인 채 사유를 남긴다', async () => {
      const 머지 = await 도는머지({ kind: 'EDIT', params: JSON.stringify({ edits }) });
      expect((await 끝내기(머지, { status: 'DONE', result: { pulled: false } })).statusCode).toBe(200);
      expect(await 저장값들()).toEqual(처음저장값);
      expect(await 읽기(머지)).toEqual({ status: 'DONE', error: 못받음 });
    });

    it('pulled 가 없으면 안 지운다', async () => {
      const 머지 = await 도는머지({ kind: 'EDIT', params: JSON.stringify({ edits }) });
      expect((await 끝내기(머지, { status: 'DONE' })).statusCode).toBe(200);
      expect(await 저장값들()).toEqual(처음저장값);
      expect(await 읽기(머지)).toEqual({ status: 'DONE', error: null });
    });

    it('반영이 실패하면 안 지운다', async () => {
      const 머지 = await 도는머지({ kind: 'EDIT', params: JSON.stringify({ edits }) });
      const res = await 끝내기(머지, { status: 'FAILED', error: 'CI 실패', result: { pulled: true } });
      expect(res.statusCode, res.body).toBe(200);
      expect(await 저장값들()).toEqual(처음저장값);
    });

    it('원본이 작성 요청인 반영은 저장값을 건드리지 않는다', async () => {
      const 머지 = await 도는머지({ kind: 'AUTHOR', spec_text: '기획서' });
      expect((await 끝내기(머지, { status: 'DONE', result: { pulled: false } })).statusCode).toBe(200);
      expect(await 저장값들()).toEqual(처음저장값);
      expect(await 읽기(머지)).toEqual({ status: 'DONE', error: null });
    });
  });
});
