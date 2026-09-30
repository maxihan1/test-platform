// 끝내기가 셈(result.coverage)을 칸 다섯에 옮기고 상세가 싣는지 (SPEC 도메인/작성 §7 finish · 상세 · §3.6 「★ 원장」)

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import authoringAgentRoutes from './agentRoutes.js';
import authoringRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
// fixture 접두사 — 자기 service_id 로만 지운다 (CLAUDE.md §3)
const 접두사 = 'XWJ';
const 맥 = 'xwj-맥';

const 셈 = {
  total: 6,
  cased: 3,
  held: 1,
  excluded: { '다음 요청': 2 },
  missing: ['REQ-X-6'],
  later: ['REQ-X-4', 'REQ-X-5'],
  unread: ['화면.pdf'],
};

describe.skipIf(연결 === undefined)('셈 — 끝내기와 상세', () => {
  let app: FastifyInstance;
  let 서비스 = 0;

  const 넣기 = async (): Promise<number> => {
    const { pool } = await import('../db/index.js');
    const r = await pool.query<{ id: string }>(
      `INSERT INTO authoring_request (service_id, kind, requested_by, requested_by_name, status, claimed_by, started_at)
       VALUES ($1, 'AUTHOR', 'xwj1', '요청자', 'RUNNING', $2, now()) RETURNING id`,
      [서비스, 맥],
    );
    return Number(r.rows[0]!.id);
  };
  const 칸읽기 = async (id: number) => {
    const { pool } = await import('../db/index.js');
    const r = await pool.query(
      `SELECT status, coverage_total, coverage_cased, coverage_held, coverage_excluded, coverage_missing
         FROM authoring_request WHERE id = $1`,
      [id],
    );
    return r.rows[0] as Record<string, unknown>;
  };
  const 끝내기 = (id: number, 본문: object) =>
    app.inject({ method: 'POST', url: `/api/authoring/requests/${id}/finish`, payload: 본문 });
  const 상세 = async (id: number) =>
    (await app.inject({ method: 'GET', url: `/api/authoring/requests/${id}` })).json() as { coverage: unknown };

  beforeAll(async () => {
    const { pool } = await import('../db/index.js');
    const r = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, 'XWJ 셈 통로 검사용', '#3A5FCD', 'https://github.com/acme/xwj', 'xwj')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true RETURNING id`,
      [접두사],
    );
    서비스 = Number(r.rows[0]!.id);
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
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

  it('모양이 틀리면 400 BAD_COVERAGE 이고 행은 도는 중 그대로다', async () => {
    const id = await 넣기();
    const res = await 끝내기(id, { status: 'DONE', result: { coverage: { ...셈, total: 7 } } });
    expect([res.statusCode, res.json()]).toEqual([400, { error: 'BAD_COVERAGE' }]);
    expect((await 칸읽기(id)).status).toBe('RUNNING');
  });

  it('DONE 이면 칸 다섯에 옮기고 상세가 셈을 그대로 싣는다', async () => {
    const id = await 넣기();
    expect((await 끝내기(id, { status: 'DONE', result: { coverage: 셈 } })).statusCode).toBe(200);
    expect(await 칸읽기(id)).toEqual({
      status: 'DONE',
      coverage_total: 6,
      coverage_cased: 3,
      coverage_held: 1,
      coverage_excluded: 2,
      coverage_missing: 1,
    });
    expect((await 상세(id)).coverage).toEqual(셈);
  });

  it('올리기 거절(STOPPED · REJECTED)에도 옮긴다 — 보류는 모른다', async () => {
    const id = await 넣기();
    const 본문 = { status: 'STOPPED', stopReason: 'REJECTED', error: 'push 가 실패했다', result: { coverage: { ...셈, held: null } } };
    expect((await 끝내기(id, 본문)).statusCode).toBe(200);
    const 칸 = await 칸읽기(id);
    expect([칸.status, 칸.coverage_total, 칸.coverage_held]).toEqual(['STOPPED', 6, null]);
  });

  it('원장이 없으면 칸은 비고 상세는 까닭을 싣는다', async () => {
    const id = await 넣기();
    const 없음 = { none: '글자본이 없는 자료(PDF · 피그마)' };
    expect((await 끝내기(id, { status: 'DONE', result: { coverage: 없음 } })).statusCode).toBe(200);
    expect((await 칸읽기(id)).coverage_total).toBeNull();
    expect((await 상세(id)).coverage).toEqual(없음);
  });

  it('셈이 없으면 칸은 비고 상세는 null', async () => {
    const id = await 넣기();
    expect((await 끝내기(id, { status: 'FAILED', error: '못 했다' })).statusCode).toBe(200);
    expect((await 칸읽기(id)).coverage_total).toBeNull();
    expect((await 상세(id)).coverage).toBeNull();
  });
});
