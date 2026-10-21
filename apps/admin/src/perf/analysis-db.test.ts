// 성능 실행의 AI 분석을 실제 DB 로 본다 — 끝나면 일이 서는 조건 · 다시 만들기 통로 · 일이 끝나면 실행에 쓰기 (PERF-F1-06)

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 끝내기 } from './finish.js';
import { 차리기, type 차림 } from './dbFixture.js';

const 연결 = process.env.DATABASE_URL;
const 원래맥 = process.env.AUTHORING_AGENT_USER;

describe.skipIf(연결 === undefined)('성능 AI 분석', { timeout: 60_000 }, () => {
  let f: 차림;
  let 시나리오 = 0;
  let 에이전트 = '';

  const 숫자 = [
    { sec: 0, vus: 10, requests: 100, errors: 0, ms: 200 },
    { sec: 0, vus: 10, requests: 100, errors: 0, ms: 200, tx: '목록' },
  ];
  const 일들 = async (runId: number) =>
    (await f.pool.query<{ id: string; status: string; created_by: string; input: Record<string, unknown> }>(
      `SELECT id, status, created_by, input FROM perf_ai_job WHERE run_id = $1 AND kind = 'ANALYZE_RUN' ORDER BY id`,
      [runId],
    )).rows;

  beforeAll(async () => {
    f = await 차리기('XPKA');
    시나리오 = await f.시나리오만들기('분석 대상');
    에이전트 = await f.계정추가('xpka-agent', 'none', 'write');
    process.env.AUTHORING_AGENT_USER = 'xpka-agent';
  });
  afterAll(async () => {
    process.env.AUTHORING_AGENT_USER = 원래맥;
    await f?.정리();
  });

  it('실행이 끝나면 재료 표를 담은 ANALYZE_RUN 일이 선다 — 오류로 끝났거나 숫자가 없으면 서지 않는다', async () => {
    const 도는 = await f.실행넣기({ scenarioId: 시나리오, status: 'RUNNING', verdict: null, series: 숫자 });
    await 끝내기(도는, { kind: 'DONE' });
    const 일 = await 일들(도는);
    expect(일).toHaveLength(1);
    expect(일[0]).toMatchObject({ status: 'QUEUED', created_by: 'system' });
    expect(일[0]?.input).toMatchObject({ summary: { status: 'DONE', peakVus: 10 }, servers: [], previous: null });
    expect((일[0]?.input as { transactions: { tx: string }[] }).transactions.map((t) => t.tx)).toEqual(['목록']);

    const 오류 = await f.실행넣기({ scenarioId: 시나리오, status: 'RUNNING', verdict: null, series: 숫자 });
    await 끝내기(오류, { kind: 'ERROR', why: '시험' });
    expect(await 일들(오류)).toHaveLength(0);

    const 빈것 = await f.실행넣기({ scenarioId: 시나리오, status: 'RUNNING', verdict: null });
    await 끝내기(빈것, { kind: 'DONE' });
    expect(await 일들(빈것)).toHaveLength(0);
  });

  it('다시 만들기는 끝난 실행에만, 숫자가 있을 때만 받고 진행 중인 일이 있으면 그 번호를 돌려준다', async () => {
    const 분석 = (cookie: string, id: number) => f.사람(cookie, 'POST', `/api/perf/runs/${id}/analysis`);
    expect((await 분석(f.쓰기, 999_999_999)).statusCode).toBe(404);
    const 도는 = await f.실행넣기({ scenarioId: 시나리오, status: 'RUNNING', verdict: null, series: 숫자 });
    expect((await 분석(f.쓰기, 도는)).json()).toEqual({ error: 'NOT_FINISHED' });
    const 빈것 = await f.실행넣기({ scenarioId: 시나리오, status: 'ERROR', verdict: null });
    expect((await 분석(f.쓰기, 빈것)).json()).toEqual({ error: 'NO_DATA' });

    const 끝난 = await f.실행넣기({ scenarioId: 시나리오, series: 숫자 });
    expect((await 분석(f.읽기만, 끝난)).statusCode).toBe(403);
    const 첫 = await 분석(f.쓰기, 끝난);
    expect(첫.statusCode).toBe(202);
    const { jobId } = 첫.json<{ jobId: number }>();
    expect((await 분석(f.쓰기, 끝난)).json()).toEqual({ jobId });
    const 보기 = (await f.사람(f.읽기만, 'GET', `/api/perf/runs/${끝난}`)).json<{ aiJob: { id: number; status: string } }>();
    expect(보기.aiJob).toEqual({ id: jobId, status: 'QUEUED' });
  });

  it('작성 에이전트가 일을 끝내면 그 실행의 ai 칸에 쓰고, 모양이 틀린 결과는 쓰지 않는다', async () => {
    await f.pool.query(`UPDATE perf_ai_job SET status = 'FAILED' WHERE service_id = $1 AND status = 'QUEUED'`, [f.서비스]);
    const 끝난 = await f.실행넣기({ scenarioId: 시나리오, series: 숫자 });
    const { jobId } = (await f.사람(f.쓰기, 'POST', `/api/perf/runs/${끝난}/analysis`)).json<{ jobId: number }>();
    const 집은 = (await f.사람(에이전트, 'POST', '/api/perf/ai-jobs/claim')).json<{ job: { id: number; kind: string } | null }>().job;
    expect(집은).toMatchObject({ id: jobId, kind: 'ANALYZE_RUN' });

    const 나쁨 = await f.사람(에이전트, 'POST', `/api/perf/ai-jobs/${jobId}/finish`, { output: { title: '제목', items: [] } });
    expect(나쁨.statusCode).toBe(400);
    const ai읽기 = async () => (await f.pool.query<{ ai: unknown }>('SELECT ai FROM perf_run WHERE id = $1', [끝난])).rows[0]?.ai;
    expect(await ai읽기()).toBeNull();

    const 다시 = (await f.사람(f.쓰기, 'POST', `/api/perf/runs/${끝난}/analysis`)).json<{ jobId: number }>().jobId;
    expect(다시).not.toBe(jobId);
    await f.사람(에이전트, 'POST', '/api/perf/ai-jobs/claim');
    const 좋음 = await f.사람(에이전트, 'POST', `/api/perf/ai-jobs/${다시}/finish`, { output: { title: '300명에서 느려졌습니다', items: ['임계점: 300명'] } });
    expect(좋음.statusCode).toBe(204);
    expect(await ai읽기()).toEqual({ title: '300명에서 느려졌습니다', items: ['임계점: 300명'] });
  });
});
