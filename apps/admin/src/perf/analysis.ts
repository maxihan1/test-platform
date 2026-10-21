// 성능 실행의 AI 분석 — 재료 표 만들기 · ANALYZE_RUN 일 세우기 · 결과 쓰기 (도메인/성능 §7 「실행 · 결과」 AI 분석)

import { 일만들기 } from './ai.js';
import { 실행보기 } from './runView.js';
import * as 표 from './store.js';

type 실행raw = {
  service_id: string; status: string; verdict: string | null; stop_reason: string | null; test_type: string | null; targets: unknown;
  peak_vus: number | null; max_tps: string | null; p95_ms: number | null; error_rate: string | null;
};

const 숫자 = (v: string | null) => (v === null ? null : Number(v));
const 한자리 = (v: number) => Math.round(v * 10) / 10;

/** 서버 모니터링 요약 — 에이전트마다 CPU · 메모리의 최대와 평균. AI 가 그래프를 못 보니 admin 이 센 숫자만 준다 */
async function 서버요약(runId: number) {
  const r = await (await 표.풀()).query<{ agent_name: string; cpu_max: number; cpu_avg: number; mem_max: number; mem_avg: number }>(
    `SELECT agent_name, max(cpu)::float AS cpu_max, avg(cpu)::float AS cpu_avg, max(mem)::float AS mem_max, avg(mem)::float AS mem_avg
       FROM perf_host_metric WHERE run_id = $1 GROUP BY agent_id, agent_name ORDER BY agent_name`,
    [runId],
  );
  return r.rows.map((x) => ({ agent: x.agent_name, cpuMax: 한자리(x.cpu_max), cpuAvg: 한자리(x.cpu_avg), memMax: 한자리(x.mem_max), memAvg: 한자리(x.mem_avg) }));
}

/** 이 재료 밖의 숫자는 AI 가 쓰지 못한다 — 판정 · 요약 · 목표별 측정값 · 트랜잭션별 · 서버 · 이전 실행 대비를 모두 여기서 센다 */
export async function 분석재료(run: 표.실행행): Promise<{ serviceId: number; input: unknown } | null> {
  const pool = await 표.풀();
  const r = await pool.query<실행raw>(
    `SELECT service_id, status, verdict, stop_reason, test_type, targets, peak_vus, max_tps, p95_ms, error_rate FROM perf_run WHERE id = $1`,
    [run.id],
  );
  const x = r.rows[0];
  if (x === undefined) return null;
  const 보기 = await 실행보기(run, x.status, x.stop_reason);
  const prevId = run.scenarioId === null ? null : await 표.이전실행(run);
  const prev = prevId === null ? null : (await pool.query<{ verdict: string | null; peak_vus: number | null; max_tps: string | null; p95_ms: number | null; error_rate: string | null }>(
    'SELECT verdict, peak_vus, max_tps, p95_ms, error_rate FROM perf_run WHERE id = $1',
    [prevId],
  )).rows[0] ?? null;
  return {
    serviceId: Number(x.service_id),
    input: {
      summary: {
        testType: x.test_type, status: x.status, verdict: x.verdict, stopReason: x.stop_reason,
        peakVus: x.peak_vus, maxTps: 숫자(x.max_tps), p95Ms: x.p95_ms, errorRate: 숫자(x.error_rate),
      },
      targets: x.targets ?? [],
      transactions: 보기.transactions,
      comparePoint: 보기.comparePoint,
      servers: await 서버요약(run.id),
      previous: prev === null ? null : {
        verdict: prev.verdict, peakVus: prev.peak_vus, maxTps: 숫자(prev.max_tps), p95Ms: prev.p95_ms, errorRate: 숫자(prev.error_rate),
      },
    },
  };
}

/** 1초 숫자가 하나라도 있나 — 없으면 분석할 재료가 없다 */
export async function 숫자있나(runId: number): Promise<boolean> {
  const r = await (await 표.풀()).query(`SELECT 1 FROM perf_series WHERE run_id = $1 AND tx = '' LIMIT 1`, [runId]);
  return (r.rowCount ?? 0) > 0;
}

/**
 * 그 실행의 ANALYZE_RUN 일을 세운다. 같은 실행의 일이 이미 대기·진행 중이면 새로 만들지 않고 그 번호를 준다.
 * 실행이 없으면 null
 */
export async function 분석일세우기(runId: number, who: string): Promise<number | null> {
  const run = await 표.실행하나(runId);
  if (run === null) return null;
  const pool = await 표.풀();
  const 진행 = await pool.query<{ id: string }>(
    `SELECT id FROM perf_ai_job WHERE run_id = $1 AND kind = 'ANALYZE_RUN' AND status IN ('QUEUED', 'RUNNING') ORDER BY id DESC LIMIT 1`,
    [runId],
  );
  if (진행.rows[0] !== undefined) return Number(진행.rows[0].id);
  const 재료 = await 분석재료(run);
  if (재료 === null) return null;
  return 일만들기('ANALYZE_RUN', 재료.serviceId, 재료.input, who, false, runId);
}

/** 끝난 분석 일의 결과를 그 실행에 쓴다 — 결과 화면과 PDF 가 perf_run.ai 를 읽는다 */
export async function 분석결과쓰기(runId: number, output: unknown): Promise<void> {
  await (await 표.풀()).query('UPDATE perf_run SET ai = $2 WHERE id = $1', [runId, JSON.stringify(output)]);
}
