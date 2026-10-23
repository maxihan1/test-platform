// 뿌리 잠금 통로 검사 — 풀에 연결이 하나만 남아도 잠금 안 질의가 끝난다 (SPEC 도메인/작성 §7 「실행 기록」 · 리뷰 H1)

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import authoringAgentRoutes from './agentRoutes.js';
import type { 보류 } from './held.js';
import authoringRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XLK';
const 맥 = 'xlk-맥';
const 사람 = 'xlk1';

const 쿠폰: 보류 = {
  tcId: 'XLK-001',
  file: 'tests/xlk/coupon.spec.ts',
  kind: 'UNDECIDABLE',
  reason: '판정 불가 — 최종 금액 기준이 없다',
  fields: [
    { side: 'params', key: 'wait', description: '대기 초', type: 'number' },
    { side: 'expected', key: 'total', description: '최종 금액', type: 'number' },
  ],
};
const 다채움 = { 'XLK-001': { params: { wait: 3 }, expected: { total: 1 }, by: 사람, at: 'x' } };

describe.skipIf(연결 === undefined)('뿌리 잠금 — 풀에 연결이 하나만 남아도 끝난다', { timeout: 15_000 }, () => {
  let app: FastifyInstance;
  let 서비스 = 0;
  let 부르는이 = 사람;

  const pool = async () => (await import('../db/index.js')).pool;
  const 넣기 = async (칸: { status: string; kind?: string; source?: number; input?: object }): Promise<number> => {
    const r = await (await pool()).query<{ id: string }>(
      `INSERT INTO authoring_request
         (service_id, kind, source_id, requested_by, requested_by_name, status, claimed_by, started_at, finished_at,
          result, held_input, pr_url)
       VALUES ($1, $2, $3, $4, '요청자', $5, $6, now(),
               CASE WHEN $5 IN ('PENDING', 'RUNNING') THEN NULL ELSE now() END, $7, $8, $9)
       RETURNING id`,
      [
        서비스,
        칸.kind ?? 'AUTHOR',
        칸.source ?? null,
        사람,
        칸.status,
        칸.status === 'PENDING' ? null : 맥,
        JSON.stringify({ held: [쿠폰] }),
        칸.input === undefined ? null : JSON.stringify(칸.input),
        칸.status === 'DONE' ? 'https://github.com/acme/xlk/pull/1' : null,
      ],
    );
    return Number(r.rows[0]!.id);
  };
  // 잠금이 연결 하나를 쥔다 — 그 안에서 풀을 또 부르면 남은 연결이 없어 끝없이 기다린다
  const 하나만남기고 = async (method: 'PUT' | 'DELETE' | 'POST', url: string, payload?: object) => {
    const p = await pool();
    const 쥔것 = await Promise.all(Array.from({ length: (p.options.max ?? 10) - 1 }, () => p.connect()));
    try {
      return await app.inject({ method, url, ...(payload === undefined ? {} : { payload }) });
    } finally {
      for (const c of 쥔것) c.release();
    }
  };

  beforeAll(async () => {
    const p = await pool();
    const r = await p.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, 'XLK 뿌리 잠금 검사용', '#3A5FCD', 'https://github.com/acme/xlk', 'xlk')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true RETURNING id`,
      [접두사],
    );
    서비스 = Number(r.rows[0]!.id);
    await p.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await p.query('DELETE FROM service_env WHERE service_id = $1', [서비스]);
    await p.query(
      `INSERT INTO service_env (service_id, env, base_url, login_id, login_password)
       VALUES ($1, 'stg', 'https://stg.xlk.test', 'tester', 'pw-xlk')`,
      [서비스],
    );
    process.env.AUTHORING_AGENT_USER = 맥;
    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = { username: 부르는이, displayName: 부르는이, role: 'admin', dashboard: 'read', mustChangePassword: false, services: [] };
    });
    await app.register(authoringRoutes, { prefix: '/api' });
    await app.register(authoringAgentRoutes, { prefix: '/api' });
    await app.ready();
  });

  beforeEach(async () => {
    부르는이 = 사람;
    await (await pool()).query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
  });

  afterAll(async () => {
    const p = await pool();
    await p.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await p.query('DELETE FROM service_env WHERE service_id = $1', [서비스]);
    await p.query('DELETE FROM service WHERE id = $1', [서비스]);
    await app.close();
  });

  it('보류 값 넣기 · 되돌리기', async () => {
    const id = await 넣기({ status: 'DONE' });
    expect((await 하나만남기고('PUT', `/api/authoring/requests/${id}/held/XLK-001`, { removed: true })).statusCode).toBe(200);
    expect((await 하나만남기고('DELETE', `/api/authoring/requests/${id}/held/XLK-001`)).statusCode).toBe(200);
  });

  it('다시 작성', async () => {
    const id = await 넣기({ status: 'DONE' });
    const r = await 하나만남기고('POST', `/api/authoring/requests?service=${접두사}`, { kind: 'RERUN', sourceId: id });
    expect(r.statusCode).toBe(201);
  });

  it('반영 — 보류 판정 · 대상 서버 줄 읽기까지', async () => {
    const id = await 넣기({ status: 'DONE', input: 다채움 });
    const r = await 하나만남기고('POST', `/api/authoring/merges?service=${접두사}`, { sourceId: id, env: 'stg' });
    expect(r.statusCode).toBe(201);
  });

  it('끝내기 — 앞 실행의 보류 입력 옮기기까지', async () => {
    const 앞 = await 넣기({ status: 'DONE', input: 다채움 });
    const 새 = await 넣기({ status: 'RUNNING', kind: 'RERUN', source: 앞 });
    부르는이 = 맥;
    const r = await 하나만남기고('POST', `/api/authoring/requests/${새}/finish`, { status: 'DONE', result: { held: [쿠폰] } });
    expect(r.statusCode).toBe(200);
  });
});
