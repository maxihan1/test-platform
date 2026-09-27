// 작성 토큰 사용량 통로 검사 — 칸 · 한 번만 · 집은 쪽만 · 대시보드 칸 권한 (SPEC 도메인/작성 §7 「토큰 사용량」)

import Fastify, { type FastifyInstance } from 'fastify';
import { Client } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { 등급표, 토큰통로 } from '../auth/gate.js';
import { 라우트표 } from '../auth/scope.js';
import authoringAgentRoutes from './agentRoutes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XWK';

const 좋은몸 = { input: 952, output: 475, cacheRead: 55784, cacheWrite: 8219, partial: false, costUsd: 0.0253, model: 'claude-opus-5-5' };

describe('usage 통로가 권한 표 셋에 든다', () => {
  it('등급표 operator · 에이전트 토큰 통로 · 라우트표 작성요청', () => {
    expect(등급표['POST /api/authoring/requests/:id/usage']).toBe('operator');
    expect(토큰통로.has('POST /api/authoring/requests/:id/usage')).toBe(true);
    expect(라우트표['/api/authoring/requests/:id/usage']).toEqual({ 종류: '작성요청', 칸: 'id' });
  });
});

describe.skipIf(연결 === undefined)('작성 토큰 사용량', () => {
  let app: FastifyInstance;
  let 서비스 = 0;
  const 에이전트 = `${접두사.toLowerCase()}-에이전트`;
  let 부르는이 = 에이전트;

  async function 행(상태: 'RUNNING' | 'DONE', 집은이 = 에이전트): Promise<number> {
    const { pool } = await import('../db/index.js');
    const r = await pool.query<{ id: string }>(
      `INSERT INTO authoring_request (service_id, kind, spec_text, requested_by, requested_by_name, status, claimed_by)
       VALUES ($1, 'AUTHOR', '본문', 'tester', '시험자', $2, $3) RETURNING id`,
      [서비스, 상태, 집은이],
    );
    return Number(r.rows[0]!.id);
  }

  const 알리기 = (id: number, 몸: Record<string, unknown>) =>
    app.inject({ method: 'POST', url: `/api/authoring/requests/${id}/usage`, payload: 몸 });

  async function 칸들(id: number) {
    const { pool } = await import('../db/index.js');
    const r = await pool.query(
      `SELECT tokens_input, tokens_output, tokens_cache_read, tokens_cache_write, tokens_partial, cost_usd, tokens_model
         FROM authoring_request WHERE id = $1`,
      [id],
    );
    return r.rows[0] as Record<string, unknown>;
  }

  beforeAll(async () => {
    const { pool } = await import('../db/index.js');
    const r = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, $2, '#3A5FCD', 'https://github.com/acme/xwk', 'xwk')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
      [접두사, `${접두사} 토큰 검사용`],
    );
    서비스 = Number(r.rows[0]!.id);
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);

    process.env.AUTHORING_AGENT_USER = 에이전트;
    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = { username: 부르는이, displayName: '토큰 검사', role: 'operator' as const, services: [] };
    });
    await app.register(authoringAgentRoutes, { prefix: '/api' });
    await app.ready();
  });

  beforeEach(() => {
    부르는이 = 에이전트;
  });

  afterAll(async () => {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
    await app.close();
  });

  it('집은 에이전트가 도는 행에 알리면 칸 일곱에 남는다', async () => {
    const id = await 행('RUNNING');
    const r = await 알리기(id, 좋은몸);
    expect(r.statusCode).toBe(200);
    expect(await 칸들(id)).toEqual({
      tokens_input: '952',
      tokens_output: '475',
      tokens_cache_read: '55784',
      tokens_cache_write: '8219',
      tokens_partial: false,
      cost_usd: '0.025300',
      tokens_model: 'claude-opus-5-5',
    });
  });

  it('끊긴 요청은 비용·모델 없이 하한값으로 남긴다', async () => {
    const id = await 행('RUNNING');
    const r = await 알리기(id, { input: 1, output: 2, cacheRead: 3, cacheWrite: 4, partial: true });
    expect(r.statusCode).toBe(200);
    expect(await 칸들(id)).toMatchObject({ tokens_partial: true, cost_usd: null, tokens_model: null });
  });

  it('두 번째는 409 — 먼저 온 값을 덮지 않는다', async () => {
    const id = await 행('RUNNING');
    await 알리기(id, 좋은몸);
    const r = await 알리기(id, { ...좋은몸, input: 1 });
    expect(r.statusCode).toBe(409);
    expect(r.json()).toEqual({ error: 'USAGE_TAKEN' });
    expect((await 칸들(id)).tokens_input).toBe('952');
  });

  it('끝난 행은 409 — 그래서 에이전트는 끝내기보다 먼저 보낸다', async () => {
    const id = await 행('DONE');
    expect((await 알리기(id, 좋은몸)).statusCode).toBe(409);
  });

  it('남이 집은 행은 403', async () => {
    const id = await 행('RUNNING', '다른-에이전트');
    부르는이 = '다른-에이전트';
    const r = await 알리기(id, 좋은몸);
    expect(r.statusCode).toBe(403);
  });

  it.each([
    [{ ...좋은몸, input: -1 }],
    [{ ...좋은몸, output: 1.5 }],
    [{ ...좋은몸, cacheRead: '3' }],
    [{ ...좋은몸, cacheWrite: undefined }],
    [{ ...좋은몸, partial: 'no' }],
    [{ ...좋은몸, costUsd: -0.1 }],
    [{ ...좋은몸, model: '' }],
    [{ ...좋은몸, model: 'm'.repeat(101) }],
  ])('모양이 틀리면 400 BAD_USAGE — %j', async (몸) => {
    const id = await 행('RUNNING');
    const r = await 알리기(id, 몸 as Record<string, unknown>);
    expect(r.statusCode).toBe(400);
    expect(r.json()).toEqual({ error: 'BAD_USAGE' });
  });

  it('대시보드 계정은 사용량 칸만 읽고 오류 글은 못 읽는다', async () => {
    const 주소 = new URL(연결 as string);
    주소.username = 'grafana_ro';
    주소.password = 'grafana_ro';
    const 읽기 = new Client({ connectionString: 주소.toString() });
    await 읽기.connect();
    try {
      await expect(
        읽기.query(
          'SELECT tokens_input, tokens_output, tokens_cache_read, tokens_cache_write, tokens_partial, cost_usd, tokens_model FROM authoring_request LIMIT 1',
        ),
      ).resolves.toBeDefined();
      await expect(읽기.query('SELECT error FROM authoring_request LIMIT 1')).rejects.toThrow(/permission denied/);
    } finally {
      await 읽기.end();
    }
  });
});
