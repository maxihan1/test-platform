// 작성 요청 실행 기록 검사 — 보이는 번호는 뿌리 하나, 실행은 기록으로 (SPEC 도메인/작성 §7 「실행 기록」)

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import authoringAgentRoutes from './agentRoutes.js';
import assetRoutes from './assets.js';
import authoringRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XWH';

describe.skipIf(연결 === undefined)('작성 요청 실행 기록', () => {
  let app: FastifyInstance;
  let 서비스 = 0;
  const 에이전트 = 'xwh-에이전트';

  async function 행(칸: {
    kind?: string;
    sourceId?: number;
    resumeFrom?: number;
    status?: string;
    stopReason?: string;
    prUrl?: string;
    error?: string;
    토큰?: [number, number, number, number];
    요청자?: string;
  } = {}): Promise<number> {
    const { pool } = await import('../db/index.js');
    const 상태 = 칸.status ?? 'FAILED';
    const r = await pool.query<{ id: string }>(
      `INSERT INTO authoring_request
         (service_id, kind, source_id, resume_from, requested_by, requested_by_name, status, claimed_by,
          stop_reason, stopped_by, pr_url, error, started_at, finished_at,
          tokens_input, tokens_output, tokens_cache_read, tokens_cache_write, tokens_partial)
       VALUES ($1, $2, $3, $4, $14, '실행 기록 검사', $5, $6, $7, CASE WHEN $7::text IS NULL THEN NULL ELSE 'system' END,
               $8, $9, now() - interval '1 hour',
               CASE WHEN $5 IN ('PENDING', 'RUNNING') THEN NULL ELSE now() END,
               $10::int, $11::int, $12::int, $13::int, CASE WHEN $10::int IS NULL THEN NULL ELSE false END)
       RETURNING id`,
      [
        서비스,
        칸.kind ?? 'AUTHOR',
        칸.sourceId ?? null,
        칸.resumeFrom ?? null,
        상태,
        상태 === 'PENDING' ? null : 에이전트,
        상태 === 'STOPPED' ? (칸.stopReason ?? 'USER') : null,
        칸.prUrl ?? null,
        칸.error ?? null,
        ...(칸.토큰 ?? [null, null, null, null]),
        칸.요청자 ?? 에이전트,
      ],
    );
    return Number(r.rows[0]!.id);
  }

  const 목록 = async (쿼리 = '') =>
    (await app.inject({ method: 'GET', url: `/api/authoring/requests?service=${접두사}${쿼리}` })).json<{
      items: { id: number; rootId: number; runCount: number; status: string }[];
      total: number;
    }>();
  const 상세 = async (id: number) =>
    (await app.inject({ method: 'GET', url: `/api/authoring/requests/${id}?service=${접두사}` })).json<{
      id: number;
      rootId: number;
      runs: {
        id: number;
        kind: string;
        resumeFrom: number | null;
        status: string;
        stopReason: string | null;
        error: string | null;
        tokens: { input: number; output: number; cacheRead: number; cacheWrite: number; partial: boolean } | null;
        prUrl: string | null;
      }[];
    }>();

  beforeAll(async () => {
    const { pool } = await import('../db/index.js');
    const r = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, $2, '#3A5FCD', 'https://github.com/acme/xwh', 'xwh')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
      [접두사, `${접두사} 실행 기록 검사용`],
    );
    서비스 = Number(r.rows[0]!.id);
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);

    process.env.AUTHORING_AGENT_USER = 에이전트;
    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = { username: 에이전트, displayName: '실행 기록 검사', role: 'member' as const, dashboard: 'read' as const, mustChangePassword: false, services: [] };
    });
    await app.register(authoringRoutes, { prefix: '/api' });
    await app.register(assetRoutes, { prefix: '/api' });
    await app.register(authoringAgentRoutes, { prefix: '/api' });
    await app.ready();
  });

  afterAll(async () => {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
    await app.close();
  });

  it('목록은 뿌리마다 한 줄 — 최근 실행의 상태 · 뿌리 번호 · 실행 수, 최근 실행 순', async () => {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    const 가 = await 행({ status: 'FAILED' });
    const 가1 = await 행({ kind: 'RERUN', sourceId: 가, status: 'STOPPED' });
    const 가2 = await 행({ kind: 'RERUN', sourceId: 가, resumeFrom: 가1, status: 'DONE', prUrl: 'https://github.com/acme/xwh/pull/1' });
    await 행({ kind: 'MERGE', sourceId: 가2, status: 'FAILED' });
    const 나 = await 행({ status: 'DONE', prUrl: 'https://github.com/acme/xwh/pull/2' });
    const 다 = await 행({ status: 'FAILED' });
    const 다1 = await 행({ kind: 'RERUN', sourceId: 다, status: 'FAILED' });
    await 행({ kind: 'RERUN', sourceId: 다1, status: 'STOPPED' });

    const 전부 = await 목록();
    expect(전부.total).toBe(3);
    expect(전부.items.map((i) => [i.rootId, i.runCount, i.status])).toEqual([
      [다, 3, 'STOPPED'],
      [나, 1, 'DONE'],
      [가, 4, 'FAILED'],
    ]);
    expect((await 목록('&status=DONE')).items.map((i) => i.rootId)).toEqual([나]);
  });

  it('상세는 어느 실행 번호로 읽어도 뿌리와 실행 기록 전부를 싣는다 — 토큰은 그 실행이 쓴 것만 네 칸', async () => {
    const 가 = await 행({ status: 'FAILED', 토큰: [100, 10, 1000, 50], error: '첫 줄\n둘째 줄' });
    const 가1 = await 행({ kind: 'RERUN', sourceId: 가, status: 'STOPPED', stopReason: 'REJECTED', error: '올리기 거절', 토큰: [7, 3, 200, 0] });
    const 가2 = await 행({ kind: 'RERUN', sourceId: 가, resumeFrom: 가1, status: 'RUNNING' });

    const 옛번호로 = await 상세(가1);
    expect(옛번호로.id).toBe(가1);
    expect(옛번호로.rootId).toBe(가);
    expect(옛번호로.runs.map((r) => r.id)).toEqual([가2, 가1, 가]);
    expect(옛번호로.runs[0]).toMatchObject({ kind: 'RERUN', resumeFrom: 가1, status: 'RUNNING', tokens: null });
    expect(옛번호로.runs[1]).toMatchObject({
      stopReason: 'REJECTED',
      error: '올리기 거절',
      tokens: { input: 7, output: 3, cacheRead: 200, cacheWrite: 0, partial: false },
    });
    expect(옛번호로.runs[2]).toMatchObject({ error: '첫 줄', tokens: { input: 100, output: 10, cacheRead: 1000, cacheWrite: 50 } });
    expect((await 상세(가)).runs.map((r) => r.id)).toEqual([가2, 가1, 가]);
  });

  it('한 뿌리에 대기 · 작성 중인 실행이 있으면 다시 작성 · 머지를 409 RUN_ACTIVE 로 막는다', async () => {
    const 가 = await 행({ status: 'DONE', prUrl: 'https://github.com/acme/xwh/pull/3' });
    await 행({ kind: 'RERUN', sourceId: 가, status: 'PENDING' });
    const 다시 = await app.inject({
      method: 'POST',
      url: `/api/authoring/requests?service=${접두사}`,
      payload: { kind: 'RERUN', sourceId: 가 },
    });
    expect(다시.statusCode).toBe(409);
    expect(다시.json()).toMatchObject({ error: 'RUN_ACTIVE' });
    const 머지 = await app.inject({ method: 'POST', url: `/api/authoring/merges?service=${접두사}`, payload: { sourceId: 가 } });
    expect(머지.statusCode).toBe(409);
    expect(머지.json()).toMatchObject({ error: 'RUN_ACTIVE' });
  });

  it('머지는 그 뿌리의 최신 실행만 — 뒤에 실행이 더 있으면 409 NOT_LATEST', async () => {
    const 가 = await 행({ status: 'DONE', prUrl: 'https://github.com/acme/xwh/pull/4' });
    await 행({ kind: 'RERUN', sourceId: 가, status: 'FAILED' });
    const 머지 = await app.inject({ method: 'POST', url: `/api/authoring/merges?service=${접두사}`, payload: { sourceId: 가 } });
    expect(머지.statusCode).toBe(409);
    expect(머지.json()).toMatchObject({ error: 'NOT_LATEST' });
  });

  it('폐기는 요청 통째 — 최신 실행을 버리면 그 뿌리의 실행이 모두 폐기되고 목록에서 함께 빠진다', async () => {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    const 가 = await 행({ status: 'DONE', prUrl: 'https://github.com/acme/xwh/pull/5' });
    const 가1 = await 행({ kind: 'RERUN', sourceId: 가, status: 'FAILED' });
    const 버림 = await app.inject({ method: 'POST', url: `/api/authoring/requests/${가1}/discard?service=${접두사}` });
    expect(버림.statusCode).toBe(200);
    const 남은 = await pool.query<{ n: string }>(
      'SELECT count(*) AS n FROM authoring_request WHERE service_id = $1 AND discarded_at IS NULL',
      [서비스],
    );
    expect(Number(남은.rows[0]!.n)).toBe(0);
    expect((await 목록()).total).toBe(0);
    expect((await 목록('&discarded=1')).items.map((i) => i.rootId)).toEqual([가]);
  });

  const 버리기 = (id: number) => app.inject({ method: 'POST', url: `/api/authoring/requests/${id}/discard?service=${접두사}` });

  it('폐기는 그 뿌리의 최신 실행에서만, 도는 실행이 없을 때만 — 방금 선 실행을 같이 버리지 않는다', async () => {
    const { pool } = await import('../db/index.js');
    const 가 = await 행({ status: 'FAILED' });
    await 행({ kind: 'RERUN', sourceId: 가, status: 'PENDING' });
    expect((await 버리기(가)).statusCode).toBe(409);
    const 나 = await 행({ status: 'FAILED' });
    await 행({ kind: 'RERUN', sourceId: 나, status: 'FAILED' });
    expect((await 버리기(나)).statusCode).toBe(409);
    const 남은 = await pool.query<{ n: string }>(
      'SELECT count(*) AS n FROM authoring_request WHERE id = ANY($1) AND discarded_at IS NOT NULL',
      [[가, 나]],
    );
    expect(Number(남은.rows[0]!.n)).toBe(0);
  });

  it('통째 폐기는 맨 처음 요청한 사람(또는 admin)만 — 남의 요청을 다시 돌린 사람은 못 버린다', async () => {
    const 가 = await 행({ status: 'FAILED', 요청자: 'xwh-남' });
    const 가1 = await 행({ kind: 'RERUN', sourceId: 가, status: 'FAILED' });
    const 버림 = await 버리기(가1);
    expect(버림.statusCode).toBe(403);
    expect((await 상세(가1)) as unknown as { canDiscard: boolean }).toMatchObject({ canDiscard: false });
  });

  it('실패한 머지는 최신에서 건너뛴다 — 끝난 작성 실행으로 다시 반영할 수 있다', async () => {
    const 가 = await 행({ status: 'DONE', prUrl: 'https://github.com/acme/xwh/pull/6' });
    await 행({ kind: 'MERGE', sourceId: 가, status: 'FAILED' });
    const 머지 = await app.inject({ method: 'POST', url: `/api/authoring/merges?service=${접두사}`, payload: { sourceId: 가 } });
    expect(머지.statusCode).toBe(201);
  });

  it('동시에 두 번 눌러도 한 뿌리에 새 실행은 하나만 선다', async () => {
    const 가 = await 행({ status: 'FAILED' });
    const 누름 = () =>
      app.inject({ method: 'POST', url: `/api/authoring/requests?service=${접두사}`, payload: { kind: 'RERUN', sourceId: 가 } });
    const 답들 = await Promise.all([누름(), 누름(), 누름()]);
    expect(답들.map((r) => r.statusCode).sort()).toEqual([201, 409, 409]);
  });
});
