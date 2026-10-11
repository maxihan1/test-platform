// 작성 예상 시간 — 같은 서비스의 끝난 작성 최근 5건 중간값, 작성 상세 응답의 expected (DB 접속이 있을 때만 돈다)
import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 작성예상 } from './eta.js';
import authoringRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XWE';

describe.skipIf(연결 === undefined)('작성 예상 시간', () => {
  let app: FastifyInstance;
  let 서비스 = 0;
  let 남의서비스 = 0;

  // 끝난 요청 하나. 걸린분은 started_at 과 finished_at 의 차이이고, 끝난 시각은 몇 분 전인지로 줄을 세운다
  async function 행(
    칸: { 서비스?: number; kind?: string; status?: string; 걸린분?: number; 끝난분전: number; resumeFrom?: number; params?: object; sourceId?: number },
  ): Promise<number> {
    const { pool } = await import('../db/index.js');
    const r = await pool.query<{ id: string }>(
      `INSERT INTO authoring_request (service_id, kind, requested_by, requested_by_name, status, started_at, finished_at, resume_from, params, source_id, stop_reason, stopped_by)
       VALUES ($1, $2, 'xwe', 'XWE 검사', $3,
               now() - make_interval(mins => $4::int + $5::int), now() - make_interval(mins => $4::int),
               $6, COALESCE($7::jsonb, '{}'::jsonb), $8,
               CASE WHEN $3 = 'STOPPED' THEN 'USER' ELSE NULL END, CASE WHEN $3 = 'STOPPED' THEN 'xwe' ELSE NULL END)
       RETURNING id`,
      [칸.서비스 ?? 서비스, 칸.kind ?? 'AUTHOR', 칸.status ?? 'DONE', 칸.끝난분전, 칸.걸린분 ?? 10, 칸.resumeFrom ?? null, 칸.params === undefined ? null : JSON.stringify(칸.params), 칸.sourceId ?? null],
    );
    return Number(r.rows[0]!.id);
  }

  const 치우기 = async () => {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM authoring_request WHERE service_id = ANY($1)', [[서비스, 남의서비스]]);
  };

  beforeAll(async () => {
    const { pool } = await import('../db/index.js');
    for (const [접미, 이름] of [['', '검사용'], ['B', '남의 서비스']] as const) {
      const r = await pool.query<{ id: string }>(
        `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
              VALUES ($1, $2, '#3A5FCD', '', 'xwe')
         ON CONFLICT (prefix) DO UPDATE SET is_active = true
           RETURNING id`,
        [`${접두사}${접미}`, `${접두사} ${이름}`],
      );
      if (접미 === '') 서비스 = Number(r.rows[0]!.id);
      else 남의서비스 = Number(r.rows[0]!.id);
    }
    await 치우기();

    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = { username: 'xwe', displayName: 'XWE 검사', role: 'member' as const, dashboard: 'read' as const, mustChangePassword: false, services: [] };
    });
    await app.register(authoringRoutes, { prefix: '/api' });
    await app.ready();
  });

  afterAll(async () => {
    const { pool } = await import('../db/index.js');
    await 치우기();
    await pool.query('DELETE FROM service WHERE id = ANY($1)', [[서비스, 남의서비스]]);
    await app.close();
  });

  it('끝난 작성이 한 건도 없으면 null 이다', async () => {
    await 치우기();
    expect(await 작성예상(서비스)).toBeNull();
  });

  it('최근 5건의 중간값이고 실패 · 고치기 · 남의 서비스는 세지 않는다', async () => {
    await 치우기();
    // 오래된 것부터 1 · 2 · 3 · 4 · 5 · 60분 — 가장 오래된 1분은 5건 밖이라 빠지고 2 · 3 · 4 · 5 · 60 의 중간값 4분
    for (const [i, 분] of [1, 2, 3, 4, 5, 60].entries()) await 행({ 걸린분: 분, 끝난분전: 100 - i });
    await 행({ status: 'FAILED', 걸린분: 500, 끝난분전: 1 });
    await 행({ kind: 'EDIT', 걸린분: 500, 끝난분전: 2 });
    await 행({ 서비스: 남의서비스, 걸린분: 500, 끝난분전: 3 });

    expect(await 작성예상(서비스)).toEqual({ ms: 4 * 60_000, samples: 5 });
  });

  it('이어서 작성한 것(resume_from)과 고치기 다시 적용(params.edits)은 표본에서 뺀다', async () => {
    await 치우기();
    const 중단 = await 행({ status: 'STOPPED', 걸린분: 1, 끝난분전: 90 });
    await 행({ kind: 'RERUN', sourceId: 중단, resumeFrom: 중단, 걸린분: 500, 끝난분전: 60 });
    const 원본 = await 행({ 걸린분: 8, 끝난분전: 50 });
    await 행({ kind: 'RERUN', sourceId: 원본, params: { edits: [] }, 걸린분: 500, 끝난분전: 40 });
    await 행({ kind: 'RERUN', sourceId: 원본, 걸린분: 12, 끝난분전: 30 });

    expect(await 작성예상(서비스)).toEqual({ ms: 10 * 60_000, samples: 2 });
  });

  it('상세의 expected 는 그 행이 머지 · 고치기 · 고치기 다시 적용이면 null 이다', async () => {
    await 치우기();
    const 원본 = await 행({ 걸린분: 10, 끝난분전: 50 });
    const 머지 = await 행({ kind: 'MERGE', sourceId: 원본, 끝난분전: 40 });
    const 고치기 = await 행({ kind: 'EDIT', params: { edits: [] }, 끝난분전: 30 });
    const 다시적용 = await 행({ kind: 'RERUN', sourceId: 고치기, params: { edits: [] }, 끝난분전: 20 });
    const 다시작성 = await 행({ kind: 'RERUN', sourceId: 원본, 끝난분전: 10 });

    const 상세 = async (id: number) => (await app.inject({ method: 'GET', url: `/api/authoring/requests/${id}?service=${접두사}` })).json().expected;
    expect(await 상세(머지)).toBeNull();
    expect(await 상세(고치기)).toBeNull();
    expect(await 상세(다시적용)).toBeNull();
    expect(await 상세(원본)).toEqual({ ms: 10 * 60_000, samples: 2 });
    expect(await 상세(다시작성)).toEqual({ ms: 10 * 60_000, samples: 2 });
  });

  it('작성 상세 응답에 expected 가 실린다', async () => {
    await 치우기();
    await 행({ 걸린분: 10, 끝난분전: 50 });
    const 둘째 = await 행({ 걸린분: 20, 끝난분전: 40 });

    const 상세 = (await app.inject({ method: 'GET', url: `/api/authoring/requests/${둘째}?service=${접두사}` })).json();
    expect(상세.expected).toEqual({ ms: 15 * 60_000, samples: 2 });
  });

  it('끝난 작성이 없으면 상세의 expected 는 null 이다', async () => {
    await 치우기();
    const 진행 = await 행({ status: 'FAILED', 끝난분전: 5 });

    const 상세 = (await app.inject({ method: 'GET', url: `/api/authoring/requests/${진행}?service=${접두사}` })).json();
    expect(상세.expected).toBeNull();
  });
});
