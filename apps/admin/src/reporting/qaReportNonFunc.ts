// QA 리포트 「비기능 검증」 구획의 재료 — 호환성 격자 · 성능 목표 표(성능 PDF 내용) · 안정화 오류 종류와 AI 실행 요약 (도메인/리포팅 §3.17 「종류별 구획」)
// 첫 장 숫자와 같은 실행을 고른다 — 호환성은 세트마다, 성능은 시나리오(페이지 · 기기는 종류)마다 마지막 실행 하나, 안정화는 마지막 집계 줄 하나

import type { Pool } from 'pg';

import type { SecRow } from '../perf/judge.js';
import { 요약모양, type 요약결과 } from '../stability/summaryShape.js';

type 칸값 = 'OK' | 'PENDING' | 'CONFIRMED' | 'NOT_DEFECT' | 'UNCHECKED';

export interface 호환성재료 {
  setName: string;
  runId: number;
  devices: { seq: number; model: string; name: string; os: string | null; fold: 'OPEN' | 'FOLDED' | null }[];
  /** 이상 없음만 있는 화면은 뺀 줄 — 결과 화면 표와 같다 */
  rows: { name: string; cells: { seq: number; value: 칸값; reason?: string }[] }[];
  hiddenOk: number;
  cards: { screen: string; seq: number; tcId: string; issues: { kind: string; note: string }[]; verdict: 'CONFIRMED' | 'NOT_DEFECT' | null }[];
}

export interface 성능목표 {
  metric: string;
  scope?: string;
  op: '<=' | '>=';
  value: number;
  measured: number | null;
  verdict: 'PASS' | 'FAIL';
  source: 'PRD' | 'AI' | 'MANUAL';
  reqId?: string;
}

export interface 성능재료 {
  id: number;
  kind: 'LOAD' | 'PAGE' | 'DEVICE';
  title: string;
  testType: string | null;
  status: string;
  verdict: 'PASS' | 'FAIL' | null;
  stopReason: string | null;
  startedAt: string | null;
  peakVus: number | null;
  ai: { title: string; items: string[] } | null;
  targets: 성능목표[];
  /** 기기 성능의 대상 칸(시리얼)을 모델 이름으로 */
  devices: Map<string, string>;
  /** 서버 부하만 — 시간대별 추이(전체 줄)와 트랜잭션별. 성능 PDF 와 같은 재료 */
  rows: SecRow[];
  txs: { tx: string; requests: number; errors: number; hist: number[] }[];
}

export interface 안정화재료 {
  errors: { state: 'NEW' | 'UP' | 'REOPENED'; title: string; source: string; firstDay: string; firstBuildNo: string | null; cases: number; issueKey: string | null }[];
  /** 그 집계 줄의 AI 실행 요약 — 일이 없으면 null */
  summary: { status: 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED'; 결과: 요약결과 | null; features: { name: string; errorCases: number }[]; changes: { state: string; text: string }[] } | null;
}

export interface 비기능재료 {
  호환성: 호환성재료[];
  성능: 성능재료[];
  /** 이 버전이 담은 정기 실행 집계가 없으면 null */
  안정화: 안정화재료 | null;
}

/** 첫 장 「결과 요약」과 같은 규칙 — 호환성 세트마다 가장 늦게 시작한 실행 */
export async function 고른호환성실행들(pool: Pool, runIds: number[]): Promise<number[]> {
  const r = await pool.query<{ run_id: string }>(
    `SELECT DISTINCT ON (compat_set_id) run_id FROM test_run
      WHERE run_id = ANY($1::bigint[]) AND kind = 'COMPAT' ORDER BY compat_set_id, started_at DESC, run_id DESC`,
    [runIds],
  );
  return r.rows.map((x) => Number(x.run_id));
}

async function 호환성읽기(pool: Pool, runIds: number[]): Promise<호환성재료[]> {
  const 고른 = await 고른호환성실행들(pool, runIds);
  if (고른.length === 0) return [];
  // 호환성 결과 모듈은 엔진 · 팜까지 끌고 온다 — 쓸 때만 부른다(첫 장 셈과 같다)
  const { 호환성결과 } = await import('../compat/runView.js');
  const 캐시: NonNullable<Parameters<typeof 호환성결과>[1]> = new Map();
  const 결과 = await Promise.all(고른.map((id) => 호환성결과(id, 캐시, true)));
  return 결과.flatMap((x) =>
    x === null
      ? []
      : [
          {
            setName: x.run.title,
            runId: x.run.runId,
            devices: x.devices.map((d) => ({ seq: d.seq, model: d.model, name: d.name, os: d.os, fold: d.fold })),
            rows: x.rows.map((r) => ({ name: r.name, cells: r.cells })),
            hiddenOk: x.hiddenOk,
            cards: x.cards.map((c) => ({ screen: x.rows.find((r) => r.key === c.key)?.name ?? c.key, seq: c.seq, tcId: c.tcId, issues: c.issues.map((i) => ({ kind: i.kind, note: i.note })), verdict: c.verdict })),
          },
        ],
  );
}

async function 성능읽기(pool: Pool, perfRunIds: number[]): Promise<성능재료[]> {
  // 첫 장 셈(qaReportSummary.ts 마지막만)과 같은 규칙 — 같은 종류 · 시나리오는 가장 늦게 시작한 실행 하나. 한쪽을 고치면 다른 쪽도 고친다
  const r = await pool.query<{
    id: string; kind: 성능재료['kind']; title: string | null; test_type: string | null; status: string; verdict: 'PASS' | 'FAIL' | null; stop_reason: string | null;
    started_at: Date | null; peak_vus: number | null; ai: 성능재료['ai']; targets: 성능목표[] | null; config: { devices?: { serial: string; model: string }[] };
  }>(
    `SELECT * FROM (
       SELECT DISTINCT ON (r.kind, r.scenario_id) r.id, r.kind, s.name AS title, r.test_type, r.status, r.verdict, r.stop_reason, r.started_at, r.peak_vus, r.ai, r.targets, r.config,
              COALESCE(r.started_at, r.created_at) AS s
         FROM perf_run r LEFT JOIN perf_scenario s ON s.id = r.scenario_id
        WHERE r.id = ANY($1::bigint[]) ORDER BY r.kind, r.scenario_id, COALESCE(r.started_at, r.created_at) DESC, r.id DESC) x
      ORDER BY s, id`,
    [perfRunIds],
  );
  if (r.rows.length === 0) return [];
  const 표 = await import('../perf/store.js');
  return Promise.all(
    r.rows.map(async (x) => {
      const 부하 = x.kind === 'LOAD' && !['QUEUED', 'SMOKE', 'RUNNING'].includes(x.status);
      const id = Number(x.id);
      return {
        id,
        kind: x.kind,
        title: x.title ?? '',
        testType: x.test_type,
        status: x.status,
        verdict: x.verdict,
        stopReason: x.stop_reason,
        startedAt: x.started_at?.toISOString() ?? null,
        peakVus: x.peak_vus,
        ai: x.ai,
        targets: x.targets ?? [],
        devices: new Map((x.config.devices ?? []).map((d) => [d.serial, d.model])),
        ...(부하 ? await Promise.all([표.초읽기(id, 0, 2 ** 31 - 1, ['']), 표.트랜잭션합계(id)]).then(([rows, txs]) => ({ rows, txs })) : { rows: [], txs: [] }),
      };
    }),
  );
}

async function 안정화읽기(pool: Pool, runIds: number[], buildNo: string | null): Promise<안정화재료 | null> {
  // 첫 장 안정화 줄과 같은 줄 — 이 버전이 담은 정기 실행의 마지막 집계 줄
  const 줄 = (
    await pool.query<{ run_id: string; ai_job_id: string | null }>('SELECT run_id, ai_job_id FROM stab_run WHERE run_id = ANY($1::bigint[]) ORDER BY day DESC, run_id DESC LIMIT 1', [runIds])
  ).rows[0];
  if (줄 === undefined) return null;
  // 증가 · 재발은 마지막 줄의 상태다. 그 밖에 이 빌드에서 처음 난 종류는 신규다(앞 날 집계에서 신규였어도 든다) — 안정화 화면 · 첫 장 재발 셈과 같게 마지막 줄 상태가 먼저다 (§3.17 「QAR-F1-06 이 정한 것」)
  const 오류 = await pool.query<{ state: 'NEW' | 'UP' | 'REOPENED' | 'ONGOING' | null; title: string; source: string; first_day: string; first_build_no: string | null; cases: number; issue_key: string | null }>(
    `SELECT l.state, e.title, e.source, to_char(e.first_day, 'YYYY-MM-DD') AS first_day, e.first_build_no, e.issue_key,
            COALESCE(l.cases, (SELECT max(x.cases) FROM stab_run_error x WHERE x.error_id = e.id AND x.run_id = ANY($2::bigint[])))::int AS cases
       FROM stab_error e LEFT JOIN stab_run_error l ON l.error_id = e.id AND l.run_id = $1
      WHERE e.id IN (SELECT error_id FROM stab_run_error WHERE run_id = ANY($2::bigint[]))
        AND (l.state IN ('NEW', 'UP', 'REOPENED') OR ($3::text IS NOT NULL AND e.first_build_no = $3))`,
    [줄.run_id, runIds, buildNo],
  );
  const 차례 = { NEW: 0, UP: 1, REOPENED: 2 } as const;
  const errors = 오류.rows
    .map((e) => ({
      state: e.state === 'UP' || e.state === 'REOPENED' ? e.state : ('NEW' as const),
      title: e.title,
      source: e.source,
      firstDay: e.first_day,
      firstBuildNo: e.first_build_no,
      cases: e.cases,
      issueKey: e.issue_key,
    }))
    .sort((a, b) => 차례[a.state] - 차례[b.state] || b.cases - a.cases || a.title.localeCompare(b.title, 'ko'));

  let summary: 안정화재료['summary'] = null;
  if (줄.ai_job_id !== null) {
    let 일 = (await pool.query<{ status: 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED'; output: unknown }>('SELECT status, output FROM perf_ai_job WHERE id = $1', [줄.ai_job_id])).rows[0];
    // 작성 에이전트가 쥐고 죽은 일은 안정화 화면처럼 20분 뒤 닫는다 — 리포트가 「작성 중」에 묶여 굳지 않게 (stability/view.ts)
    if (일?.status === 'RUNNING') {
      await (await import('../perf/ai.js')).오래된일닫기();
      일 = (await pool.query<{ status: 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED'; output: unknown }>('SELECT status, output FROM perf_ai_job WHERE id = $1', [줄.ai_job_id])).rows[0];
    }
    if (일 !== undefined) {
      const 결과 = 일.status === 'DONE' ? (요약모양.safeParse(일.output).data ?? null) : null;
      // 안정화 화면과 같이 — 상태 칩은 그 줄의 상태로 달고, 기능별 숫자는 AI 가 아니라 서버가 센다 (stability/view.ts)
      const [상태들, 오류케이스] = await Promise.all([
        pool.query<{ error_id: string; state: string }>('SELECT error_id, state FROM stab_run_error WHERE run_id = $1', [줄.run_id]),
        pool.query<{ tc_id: string }>('SELECT DISTINCT tc_id FROM stab_occurrence WHERE run_id = $1', [줄.run_id]),
      ]);
      const 상태 = new Map(상태들.rows.map((x) => [Number(x.error_id), x.state]));
      const 케이스 = new Set(오류케이스.rows.map((x) => x.tc_id));
      summary = {
        status: 일.status === 'DONE' && 결과 === null ? 'FAILED' : 일.status,
        결과,
        changes: (결과?.changes ?? []).flatMap((c) => (상태.has(c.errorId) ? [{ state: 상태.get(c.errorId)!, text: c.text }] : [])),
        features: (결과?.features ?? []).map((f) => ({ name: f.name, errorCases: new Set(f.tcIds.filter((t) => 케이스.has(t))).size })),
      };
    }
  }
  return { errors, summary };
}

export async function 비기능재료읽기(pool: Pool, b: { runIds: number[]; perfRunIds: number[]; buildNo: string | null }): Promise<비기능재료> {
  const [호환성, 성능, 안정화] = await Promise.all([호환성읽기(pool, b.runIds), 성능읽기(pool, b.perfRunIds), 안정화읽기(pool, b.runIds, b.buildNo)]);
  return { 호환성, 성능, 안정화 };
}
