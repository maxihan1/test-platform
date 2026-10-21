// 성능 표 읽고 쓰기 — 실행 · 1초 숫자 · 실행 로그 · 에이전트 (공통/4-데이터모델 「성능 테스트 표」)

import type { Pool, PoolClient } from 'pg';

import type { SecRow } from './judge.js';
import type { RunConfig, Target, TestType } from './types.js';

export type 묻기 = Pick<PoolClient, 'query'>;

export async function 풀(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

// 에이전트가 30초 안에 연락했으면 연결돼 있다 (§5.4 — hello 가 30초마다, 일이 없으면 claim 이 2초마다)
export const 연결초 = 30;

export interface 실행행 {
  id: number;
  serviceId: number;
  scenarioId: number | null;
  scenarioVersion: number | null;
  status: string;
  env: string;
  baseUrl: string;
  testType: TestType | null;
  config: RunConfig;
  createdAt: Date;
}

type 실행raw = { id: string; service_id: string; scenario_id: string | null; scenario_version: number | null; status: string; env: string; base_url: string; test_type: TestType | null; config: RunConfig; created_at: Date };
const 실행칸 = 'id, service_id, scenario_id, scenario_version, status, env, base_url, test_type, config, created_at';
const 실행으로 = (r: 실행raw): 실행행 => ({
  id: Number(r.id), serviceId: Number(r.service_id), scenarioId: r.scenario_id === null ? null : Number(r.scenario_id),
  scenarioVersion: r.scenario_version, status: r.status, env: r.env, baseUrl: r.base_url, testType: r.test_type, config: r.config, createdAt: r.created_at,
});

export async function 실행들(상태: string[]): Promise<실행행[]> {
  const r = await (await 풀()).query<실행raw>(`SELECT ${실행칸} FROM perf_run WHERE status = ANY($1) ORDER BY id`, [상태]);
  return r.rows.map(실행으로);
}

export async function 실행하나(id: number): Promise<실행행 | null> {
  const r = await (await 풀()).query<실행raw>(`SELECT ${실행칸} FROM perf_run WHERE id = $1`, [id]);
  return r.rows[0] === undefined ? null : 실행으로(r.rows[0]);
}

export async function 로그(runId: number, message: string, level: 'INFO' | 'WARN' = 'INFO'): Promise<void> {
  await (await 풀()).query('INSERT INTO perf_event (run_id, level, message) VALUES ($1, $2, $3)', [runId, level, message]);
}

export interface 에이전트행 {
  id: number;
  name: string;
  mode: 'LOAD' | 'MONITOR';
  projectId: number | null;
  host: string | null;
  version: string | null;
  maxVus: number | null;
  busyRunId: number | null;
  lastSeenAt: Date | null;
}

type 에이전트raw = { id: string; name: string; mode: 'LOAD' | 'MONITOR'; project_id: string | null; host: string | null; version: string | null; max_vus: number | null; busy_run_id: string | null; last_seen_at: Date | null };
const 에이전트칸 = 'id, name, mode, project_id, host, version, max_vus, busy_run_id, last_seen_at';
const 에이전트로 = (r: 에이전트raw): 에이전트행 => ({
  id: Number(r.id), name: r.name, mode: r.mode, projectId: r.project_id === null ? null : Number(r.project_id), host: r.host, version: r.version,
  maxVus: r.max_vus, busyRunId: r.busy_run_id === null ? null : Number(r.busy_run_id), lastSeenAt: r.last_seen_at,
});

export async function 에이전트들(ids?: number[]): Promise<에이전트행[]> {
  const r = ids === undefined
    ? await (await 풀()).query<에이전트raw>(`SELECT ${에이전트칸} FROM perf_agent ORDER BY id`)
    : await (await 풀()).query<에이전트raw>(`SELECT ${에이전트칸} FROM perf_agent WHERE id = ANY($1) ORDER BY id`, [ids]);
  return r.rows.map(에이전트로);
}

export const 연결됐나 = (a: 에이전트행, 지금 = Date.now()) => a.lastSeenAt !== null && 지금 - a.lastSeenAt.getTime() <= 연결초 * 1000;
// 비면 1,000 으로 센다 — 실측 전 임시 값이다 (공통/4-데이터모델 perf_agent.max_vus)
export const 최대가상사용자 = (a: 에이전트행) => a.maxVus ?? 1000;

export async function 에이전트맡기(runId: number, ids: number[]): Promise<void> {
  await (await 풀()).query('UPDATE perf_agent SET busy_run_id = $1 WHERE id = ANY($2)', [runId, ids]);
}

export async function 에이전트풀기(runId: number): Promise<void> {
  await (await 풀()).query('UPDATE perf_agent SET busy_run_id = NULL WHERE busy_run_id = $1', [runId]);
}

// 대기 → 스모크. 그사이 중단됐으면 바뀌지 않고 false 다
export async function 대기에서시작(runId: number): Promise<boolean> {
  const r = await (await 풀()).query(`UPDATE perf_run SET status = 'SMOKE', started_at = now() WHERE id = $1 AND status = 'QUEUED'`, [runId]);
  return (r.rowCount ?? 0) > 0;
}

export async function 상태바꾸기(runId: number, status: 'RUNNING'): Promise<void> {
  await (await 풀()).query(`UPDATE perf_run SET status = $2 WHERE id = $1 AND status = 'SMOKE'`, [runId, status]);
}

// 같은 초 · 같은 트랜잭션은 더한다 — 늦게 온 조각(vus 0)도 같은 행에 더하면 된다 (§5.4)
export async function 초더하기(runId: number, rows: SecRow[]): Promise<void> {
  if (rows.length === 0) return;
  await (await 풀()).query(
    `INSERT INTO perf_series (run_id, sec, tx, vus, requests, errors, hist)
     SELECT $1, x.sec, x.tx, x.vus, x.requests, x.errors, ARRAY(SELECT jsonb_array_elements_text(x.hist)::int)
       FROM jsonb_to_recordset($2::jsonb) AS x(sec int, tx text, vus int, requests int, errors int, hist jsonb)
     ON CONFLICT (run_id, sec, tx) DO UPDATE SET
       vus = perf_series.vus + EXCLUDED.vus,
       requests = perf_series.requests + EXCLUDED.requests,
       errors = perf_series.errors + EXCLUDED.errors,
       hist = ARRAY(SELECT a + b FROM unnest(perf_series.hist, EXCLUDED.hist) AS t(a, b))`,
    [runId, JSON.stringify(rows)],
  );
}

// txs 를 주면 그 트랜잭션 줄만(전체 줄은 '') 읽는다 — 긴 실행의 모든 줄을 메모리에 올리지 않게
export async function 초읽기(runId: number, from = 0, to = 2 ** 31 - 1, txs?: string[]): Promise<SecRow[]> {
  const r = await (await 풀()).query<SecRow>(
    `SELECT sec, tx, vus, requests, errors, hist FROM perf_series
      WHERE run_id = $1 AND sec BETWEEN $2 AND $3 AND ($4::text[] IS NULL OR tx = ANY($4)) ORDER BY sec, tx`,
    [runId, from, to, txs ?? null],
  );
  return r.rows;
}

// 고른 초들의 트랜잭션 줄(전체 줄 '' 은 뺀다) — 결과 화면의 트랜잭션별 셈
export async function 트랜잭션줄읽기(runId: number, secs: number[]): Promise<SecRow[]> {
  if (secs.length === 0) return [];
  const r = await (await 풀()).query<SecRow>(
    `SELECT sec, tx, vus, requests, errors, hist FROM perf_series WHERE run_id = $1 AND tx <> '' AND sec = ANY($2::int[]) ORDER BY sec, tx`,
    [runId, secs],
  );
  return r.rows;
}

// 트랜잭션마다 실행 전체를 DB 가 합친다 — PDF 「트랜잭션별 결과」
export async function 트랜잭션합계(runId: number): Promise<{ tx: string; requests: number; errors: number; hist: number[] }[]> {
  const r = await (await 풀()).query<{ tx: string; requests: string; errors: string; hist: number[] }>(
    `SELECT t.tx, t.requests, t.errors,
            ARRAY(SELECT sum(u.v)::int FROM perf_series s, unnest(s.hist) WITH ORDINALITY AS u(v, i)
                   WHERE s.run_id = $1 AND s.tx = t.tx GROUP BY u.i ORDER BY u.i) AS hist
       FROM (SELECT tx, sum(requests) AS requests, sum(errors) AS errors FROM perf_series WHERE run_id = $1 AND tx <> '' GROUP BY tx) t
      ORDER BY t.tx`,
    [runId],
  );
  return r.rows.map((x) => ({ tx: x.tx, requests: Number(x.requests), errors: Number(x.errors), hist: x.hist }));
}

export async function 서버숫자쓰기(runId: number, agent: { id: number; name: string }, m: { sec: number; cpu: number; mem: number; diskIoKbps: number; netInKbps: number; netOutKbps: number }): Promise<void> {
  await (await 풀()).query(
    `INSERT INTO perf_host_metric (run_id, agent_id, agent_name, sec, cpu, mem, disk_io_kbps, net_in_kbps, net_out_kbps)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (run_id, agent_id, sec) DO NOTHING`,
    [runId, agent.id, agent.name, m.sec, m.cpu, m.mem, Math.round(m.diskIoKbps), Math.round(m.netInKbps), Math.round(m.netOutKbps)],
  );
}

export interface 끝값 {
  status: 'DONE' | 'STOPPED' | 'ERROR';
  verdict: 'PASS' | 'FAIL' | null;
  stopReason: string | null;
  targets: (Target & { measured: number | null; verdict: 'PASS' | 'FAIL' })[] | null;
  peakVus: number | null;
  maxTps: number | null;
  p95: number | null;
  errorRate: number | null;
  degraded: boolean | null;
}

export async function 끝쓰기(runId: number, v: 끝값): Promise<boolean> {
  const r = await (await 풀()).query(
    `UPDATE perf_run SET status = $2, verdict = $3, stop_reason = $4, targets = $5, peak_vus = $6, max_tps = $7, p95_ms = $8,
            error_rate = $9, degraded = $10, finished_at = now()
      WHERE id = $1 AND status IN ('QUEUED', 'SMOKE', 'RUNNING')`,
    [runId, v.status, v.verdict, v.stopReason, v.targets === null ? null : JSON.stringify(v.targets), v.peakVus, v.maxTps,
      v.p95 === null ? null : Math.round(v.p95), v.errorRate === null ? null : Math.round(v.errorRate * 1000) / 1000, v.degraded],
  );
  await 에이전트풀기(runId);
  return (r.rowCount ?? 0) > 0;
}

// 견줄 이전 실행 — 같은 시나리오 · 같은 대상 서버 · 같은 유형, 판정이 있는 마지막 것 (§3.9 「성능 저하」)
export async function 이전실행(run: 실행행): Promise<number | null> {
  const r = await (await 풀()).query<{ id: string }>(
    `SELECT id FROM perf_run WHERE scenario_id = $1 AND env = $2 AND test_type = $3 AND verdict IS NOT NULL AND id < $4 ORDER BY id DESC LIMIT 1`,
    [run.scenarioId, run.env, run.testType, run.id],
  );
  return r.rows[0] === undefined ? null : Number(r.rows[0].id);
}

