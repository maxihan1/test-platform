// 안정화 지표 메인 응답 — 날짜 고르개 · 고른 실행 숫자 · 이전 실행 · 일별 추이 · 오류 목록 · AI 실행 요약 읽기 (도메인/안정화 §7 GET /api/stability)

import type { Pool } from 'pg';
import { z } from 'zod';

import type { 상태 } from './state.js';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

export interface 애플리케이션행 {
  id: number;
  kind: string;
  projectId: number;
  name: string;
  scheduleAt: string | null;
  scheduleTz: string | null;
}

export async function 애플리케이션읽기(serviceId: number): Promise<애플리케이션행 | null> {
  const r = (
    await (await db()).query<{ kind: string; project_id: string; name: string; at: string | null; schedule_tz: string | null }>(
      "SELECT kind, project_id, name, to_char(schedule_at, 'HH24:MI') AS at, schedule_tz FROM service WHERE id = $1 AND is_active",
      [serviceId],
    )
  ).rows[0];
  return r === undefined ? null : { id: serviceId, kind: r.kind, projectId: Number(r.project_id), name: r.name, scheduleAt: r.at, scheduleTz: r.schedule_tz };
}

/** 집계 줄 한 줄 — 숫자는 집계 때 값으로 굳었다 */
export interface 집계줄 {
  run_id: string;
  env: string;
  day: string;
  build_no: string | null;
  cases: number;
  error_cases: number;
  pass_error_cases: number;
  crashes: number | null;
  residual: number;
  new_errors: number;
  resolved: number;
  confirmed: number;
  ai_job_id: string | null;
}
const 집계칸 = `run_id, env, to_char(day, 'YYYY-MM-DD') AS day, build_no, cases, error_cases, pass_error_cases, crashes, residual, new_errors, resolved, confirmed, ai_job_id`;

export const 이전집계 = async (pool: Pool, serviceId: number, env: string, runId: number): Promise<집계줄 | undefined> =>
  (await pool.query<집계줄>(`SELECT ${집계칸} FROM stab_run WHERE service_id = $1 AND env = $2 AND run_id < $3 ORDER BY run_id DESC LIMIT 1`, [serviceId, env, runId])).rows[0];

// 화면 목록 차례 — 신규 · 증가 · 재발 · 기존 (§7)
const 상태차례 = "CASE x.state WHEN 'NEW' THEN 1 WHEN 'UP' THEN 2 WHEN 'REOPENED' THEN 3 ELSE 4 END";

/** AI 실행 요약 결과 — 모양은 끝 알리기가 본다(STAB-F1-07). 여기서는 읽을 수 있는 것만 읽고 아니면 실패로 보인다 */
const 요약모양 = z.object({
  headline: z.string(),
  changes: z.array(z.object({ errorId: z.number(), text: z.string() })),
  features: z.array(z.object({ name: z.string(), tcIds: z.array(z.string()) })),
  verified: z.string(),
  trend: z.string(),
  errors: z.array(z.object({ errorId: z.number(), headline: z.string(), impact: z.string(), previous: z.string(), cause: z.string() })),
});
export type 요약결과 = z.infer<typeof 요약모양>;
export const 요약읽기 = (output: unknown): 요약결과 | null => {
  const r = 요약모양.safeParse(output);
  return r.success ? r.data : null;
};

type 일상태 = 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED';
const 빈요약 = { headline: null, changes: null, features: null, verified: null, trend: null };

export async function 안정화보기(앱: 애플리케이션행, runId: number | null, days: 7 | 30) {
  const pool = await db();
  const schedule = 앱.scheduleAt === null ? null : { at: 앱.scheduleAt, tz: 앱.scheduleTz ?? 'UTC' };
  const 고른 = (
    await pool.query<집계줄>(
      runId === null
        ? `SELECT ${집계칸} FROM stab_run WHERE service_id = $1 ORDER BY day DESC, run_id DESC LIMIT 1`
        : `SELECT ${집계칸} FROM stab_run WHERE service_id = $1 AND run_id = $2`,
      runId === null ? [앱.id] : [앱.id, runId],
    )
  ).rows[0];
  if (고른 === undefined) {
    // 다른 애플리케이션의 번호 · 없는 번호
    if (runId !== null) return null;
    return { schedule, runs: [], run: null, summary: null, trend: [], errors: [] };
  }
  const 번호 = Number(고른.run_id);
  const { env } = 고른;

  const [runs, 이전, 최신, 묶음, trend, 목록, 오류케이스] = await Promise.all([
    // 날짜 고르개 — 가장 최근 집계 날짜에서 30일
    pool.query<{ run_id: string; day: string }>(
      `SELECT run_id, to_char(day, 'YYYY-MM-DD') AS day FROM stab_run
        WHERE service_id = $1 AND day > (SELECT max(day) FROM stab_run WHERE service_id = $1) - 30
        ORDER BY day DESC, run_id DESC`,
      [앱.id],
    ),
    이전집계(pool, 앱.id, env, 번호),
    pool.query<{ run_id: string }>('SELECT run_id FROM stab_run WHERE service_id = $1 AND env = $2 ORDER BY run_id DESC LIMIT 1', [앱.id, env]),
    // 묶음의 실행 번호 둘(UI · 기능) — 실행 줄이 지워졌으면 집계 줄 번호 하나다
    pool.query<{ run_id: string }>(
      `SELECT run_id FROM test_run
        WHERE service_id = $1 AND env = $2 AND origin = 'SCHEDULED' AND kind IN ('UI', 'FN') AND run_id <= $3
          AND (started_at AT TIME ZONE $4)::date = $5::date ORDER BY run_id`,
      [앱.id, env, 번호, 앱.scheduleTz ?? 'UTC', 고른.day],
    ),
    pool.query<{ run_id: string; day: string; residual: number; new_errors: number; build_no: string | null }>(
      `SELECT run_id, to_char(day, 'YYYY-MM-DD') AS day, residual, new_errors, build_no FROM stab_run
        WHERE service_id = $1 AND env = $2 AND day > $3::date - $4::int AND day <= $3::date ORDER BY day, run_id`,
      [앱.id, env, 고른.day, days],
    ),
    pool.query<{ id: string; title: string; state: 상태; cases: number; first_day: string; first_build_no: string | null; tc_ids: string[] }>(
      `SELECT e.id, e.title, x.state, x.cases, to_char(e.first_day, 'YYYY-MM-DD') AS first_day, e.first_build_no,
              ARRAY(SELECT DISTINCT o.tc_id FROM stab_occurrence o WHERE o.run_id = x.run_id AND o.error_id = x.error_id ORDER BY o.tc_id) AS tc_ids
         FROM stab_run_error x JOIN stab_error e ON e.id = x.error_id
        WHERE x.run_id = $1 ORDER BY ${상태차례}, x.cases DESC, e.id LIMIT 200`,
      [번호],
    ),
    pool.query<{ tc_id: string }>('SELECT DISTINCT tc_id FROM stab_occurrence WHERE run_id = $1', [번호]),
  ]);

  const 이전케이스 = new Map<number, number>();
  if (이전 !== undefined) {
    for (const r of (await pool.query<{ error_id: string; cases: number }>('SELECT error_id, cases FROM stab_run_error WHERE run_id = $1', [이전.run_id])).rows) {
      이전케이스.set(Number(r.error_id), r.cases);
    }
  }
  // 가장 최근 실행이면 「해결」은 지금 값이다 — 집계 뒤에 누른 해결 처리가 바로 보이게 (§3.15 「숫자 칸 「해결」」)
  const resolved =
    Number(최신.rows[0]?.run_id) === 번호
      ? Number(
          (
            await pool.query<{ n: string }>(
              'SELECT count(*) AS n FROM stab_error WHERE service_id = $1 AND env = $2 AND resolved_at IS NOT NULL AND confirmed_run_id IS NULL',
              [앱.id, env],
            )
          ).rows[0]!.n,
        )
      : 고른.resolved;
  const runIds = 묶음.rows.map((r) => Number(r.run_id));

  const 상태들 = new Map(목록.rows.map((r) => [Number(r.id), r.state]));
  const 오류케이스들 = new Set(오류케이스.rows.map((r) => r.tc_id));
  let summary: { status: 일상태; [k: string]: unknown } | null = null;
  if (고른.ai_job_id !== null) {
    const 일 = (await pool.query<{ status: 일상태; output: unknown }>('SELECT status, output FROM perf_ai_job WHERE id = $1', [고른.ai_job_id])).rows[0];
    const 읽은 = 일?.status === 'DONE' ? 요약읽기(일.output) : null;
    if (일 === undefined) summary = null;
    else if (일.status !== 'DONE') summary = { status: 일.status, ...빈요약 };
    else if (읽은 === null) summary = { status: 'FAILED', ...빈요약 };
    else
      summary = {
        status: 'DONE',
        headline: 읽은.headline,
        // 상태 칩은 서버가 그 실행 상태로 단다. 이 실행에 없는 번호는 버린다
        changes: 읽은.changes.flatMap((c) => {
          const state = 상태들.get(c.errorId);
          return state === undefined ? [] : [{ errorId: c.errorId, state, text: c.text }];
        }),
        // 숫자는 AI 가 세지 않는다 — 묶은 케이스 중 오류 발생 케이스를 서버가 센다
        features: 읽은.features.map((f) => ({ name: f.name, errorCases: new Set(f.tcIds.filter((t) => 오류케이스들.has(t))).size })),
        verified: 읽은.verified,
        trend: 읽은.trend,
      };
  }

  return {
    schedule,
    runs: runs.rows.map((r) => ({ runId: Number(r.run_id), day: r.day })),
    run: {
      runId: 번호,
      runIds: runIds.includes(번호) ? runIds : [번호],
      day: 고른.day,
      env,
      buildNo: 고른.build_no,
      cases: 고른.cases,
      errorCases: 고른.error_cases,
      passErrorCases: 고른.pass_error_cases,
      crashes: 고른.crashes,
      residual: 고른.residual,
      newErrors: 고른.new_errors,
      resolved,
      confirmed: 고른.confirmed,
      previous:
        이전 === undefined
          ? null
          : { runId: Number(이전.run_id), day: 이전.day, errorCases: 이전.error_cases, residual: 이전.residual, crashes: 이전.crashes },
    },
    summary,
    trend: trend.rows.map((r, i, 줄) => ({
      day: r.day,
      runId: Number(r.run_id),
      residual: r.residual,
      newErrors: r.new_errors,
      buildNo: r.build_no,
      // 빌드 번호가 없는 실행은 표시하지 않는다. 창의 첫 점은 견줄 앞 점이 없다
      buildChanged: i > 0 && r.build_no !== null && r.build_no !== 줄[i - 1]!.build_no,
    })),
    errors: 목록.rows.map((r) => ({
      id: Number(r.id),
      title: r.title,
      state: r.state,
      cases: r.cases,
      previousCases: 이전케이스.get(Number(r.id)) ?? 0,
      firstDay: r.first_day,
      firstBuildNo: r.first_build_no,
      tcIds: r.tc_ids,
    })),
  };
}
