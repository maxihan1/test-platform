// 성능 결과 · 목록에 붙는 칸을 실제 DB 로 본다 — 트랜잭션별 셈 · 견줌 지점 · AI 일 · 시나리오 이름 · 시작 방식 (PERF-F1-06)

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 차리기, type 차림 } from './dbFixture.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('성능 결과 보기 칸', { timeout: 60_000 }, () => {
  let f: 차림;
  let 시나리오 = 0;

  beforeAll(async () => {
    f = await 차리기('XPK');
    시나리오 = await f.시나리오만들기('상품 목록');
  });
  afterAll(async () => {
    await f?.정리();
  });

  const 결과 = async (id: number) => (await f.사람(f.읽기만, 'GET', `/api/perf/runs/${id}`)).json<{
    scenarioName: string; origin: string; comparePoint: number | null;
    transactions: { tx: string; p95Ms: number | null; errorRate: number | null; prevP95Ms: number | null; degraded: boolean }[];
    aiJob: { id: number; status: string } | null;
  }>();

  it('이전 실행이 없으면 트랜잭션마다 95% · 에러율만 채우고 시나리오 순서로 보인다', async () => {
    const id = await f.실행넣기({
      scenarioId: 시나리오, testType: 'SPIKE',
      series: [
        { sec: 0, vus: 10, requests: 100, errors: 0, ms: 200 },
        { sec: 0, vus: 10, requests: 40, errors: 4, ms: 300, tx: '목록' },
        { sec: 0, vus: 10, requests: 60, errors: 0, ms: 100, tx: '로그인' },
      ],
    });
    const r = await 결과(id);
    expect(r).toMatchObject({ scenarioName: '상품 목록', origin: 'MANUAL', comparePoint: null, aiJob: null });
    expect(r.transactions.map((t) => t.tx)).toEqual(['로그인', '목록']);
    expect(r.transactions[1]).toMatchObject({ errorRate: 10, prevP95Ms: null, degraded: false });
    expect(r.transactions[1]?.p95Ms).toBeGreaterThan(250);
  });

  it('이전 실행이 있으면 견줌 지점 칸끼리 견주고 20% 넘게 느린 트랜잭션만 성능 저하다', async () => {
    const 이전줄 = [
      { sec: 0, vus: 150, requests: 100, errors: 0, ms: 200 },
      { sec: 1, vus: 250, requests: 100, errors: 0, ms: 300 },
      { sec: 0, vus: 150, requests: 50, errors: 0, ms: 200, tx: '로그인' },
      { sec: 1, vus: 250, requests: 50, errors: 0, ms: 300, tx: '로그인' },
      { sec: 1, vus: 250, requests: 50, errors: 0, ms: 300, tx: '목록' },
    ];
    const 지금줄 = [
      { sec: 0, vus: 150, requests: 100, errors: 0, ms: 200 },
      { sec: 1, vus: 260, requests: 100, errors: 0, ms: 900 },
      { sec: 0, vus: 150, requests: 50, errors: 0, ms: 999, tx: '로그인' },
      { sec: 1, vus: 260, requests: 50, errors: 0, ms: 900, tx: '로그인' },
      { sec: 1, vus: 260, requests: 50, errors: 0, ms: 310, tx: '목록' },
    ];
    await f.실행넣기({ scenarioId: 시나리오, testType: 'STRESS', series: 이전줄 });
    const id = await f.실행넣기({ scenarioId: 시나리오, testType: 'STRESS', series: 지금줄 });
    const r = await 결과(id);
    expect(r.comparePoint).toBe(200);
    expect(r.transactions.map((t) => [t.tx, t.degraded])).toEqual([['로그인', true], ['목록', false]]);
    expect(r.transactions[0]?.prevP95Ms).toBeGreaterThan(250);
  });

  it('도는 실행은 트랜잭션별 셈을 비워 두고 가장 최근 ANALYZE_RUN 일을 싣는다', async () => {
    const id = await f.실행넣기({ scenarioId: 시나리오, status: 'RUNNING', series: [{ sec: 0, vus: 1, requests: 1, errors: 0, ms: 100, tx: '목록' }] });
    await f.pool.query(`INSERT INTO perf_ai_job (kind, service_id, run_id, input, status) VALUES ('ANALYZE_RUN', $1, $2, '{}', 'FAILED'), ('ANALYZE_RUN', $1, $2, '{}', 'QUEUED')`, [f.서비스, id]);
    const r = await 결과(id);
    expect(r.transactions).toEqual([]);
    expect(r.aiJob?.status).toBe('QUEUED');
  });

  it('지운 시나리오의 실행도 이름이 남는다(지움 표시만 한다) — 목록에는 유형 · 시작 방식 · 성능 저하 · 중단 사유가 붙는다', async () => {
    const 지울것 = await f.시나리오만들기('곧 지울 것');
    await f.실행넣기({ scenarioId: 지울것, origin: 'SCHEDULED', testType: 'SOAK', degraded: true, status: 'STOPPED', verdict: null, stopReason: 'USER' });
    const 목록 = (await f.사람(f.읽기만, 'GET', `/api/perf/runs?serviceId=${f.서비스}&scenarioId=${지울것}`)).json<{ runs: Record<string, unknown>[] }>().runs;
    expect(목록[0]).toMatchObject({ testType: 'SOAK', origin: 'SCHEDULED', degraded: true, stopReason: 'USER', title: '곧 지울 것' });
    expect((await f.사람(f.관리자, 'DELETE', `/api/perf/scenarios/${지울것}`)).statusCode).toBe(204);
    const id = Number(목록[0]?.id);
    expect((await 결과(id)).scenarioName).toBe('곧 지울 것');
  });
});
