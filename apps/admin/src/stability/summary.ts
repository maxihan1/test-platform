// 안정화 AI 실행 요약 일 — 집계 끝에 세우기 · 작성 에이전트가 가져갈 때 재료 만들기 (도메인/안정화 §3.15 「AI 실행 요약」 「맡기기」 · 「재료」)

import type { Pool, PoolClient } from 'pg';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

export const 재료종류상한 = 30;
export const 재료케이스상한 = 500;
export const 견본앞자 = 1500;
// ponytail: 종류 하나에 발생이 수백 건이면 재료가 프롬프트 한도를 넘는다 — 앞 50건만 싣고 잘렸다고 알린다. 명세가 수를 정하면 그 값으로 바꾼다
export const 종류발생상한 = 50;

/** 집계 저장과 같은 트랜잭션에서 부른다 — 집계 줄과 요약 일이 같이 생기거나 같이 없다 */
export async function 요약일세우기(client: Pick<PoolClient, 'query'>, serviceId: number, runId: number): Promise<number> {
  const r = await client.query<{ id: string }>(
    `INSERT INTO perf_ai_job (kind, service_id, input, status, created_by) VALUES ('STAB_SUMMARY', $1, $2, 'QUEUED', '스케줄러') RETURNING id`,
    [serviceId, JSON.stringify({ runId })],
  );
  const id = Number(r.rows[0]!.id);
  await client.query('UPDATE stab_run SET ai_job_id = $1 WHERE run_id = $2', [id, runId]);
  return id;
}

/**
 * 가져간 일의 재료를 만들어 그 일의 input 에 굳힌다 — 끝 알리기가 같은 재료로 번호를 거른다.
 * 집계 줄이 없으면(지워졌거나 다른 애플리케이션) 까닭을 낸다 — 부르는 쪽이 일을 실패로 닫는다
 */
export async function 요약재료(jobId: number, serviceId: number, input: unknown): Promise<{ input: Record<string, unknown> } | { error: string }> {
  const runId = (input as { runId?: unknown } | null)?.runId;
  if (typeof runId !== 'number') return { error: '요약 일에 실행 번호가 없습니다' };
  // view.ts 는 aggregate.ts 를 불러온다 — 집계가 이 파일을 부르므로 고리가 생기지 않게 쓸 때 불러온다
  const { 안정화보기, 애플리케이션읽기 } = await import('./view.js');
  const 앱 = await 애플리케이션읽기(serviceId);
  const 보기 = 앱 === null ? null : await 안정화보기(앱, runId, 7);
  if (보기?.run == null) return { error: `실행 ${String(runId)} 의 집계 줄이 없습니다` };
  const { run, trend } = 보기;

  const pool = await db();
  const 종류 = 보기.errors.slice(0, 재료종류상한);
  const 번호들 = 종류.map((e) => e.id);
  const [해결시각, 견본, 발생, 확인, 케이스] = await Promise.all([
    // 재발은 그 실행이 걷은 해결 처리 시각, 나머지는 지금 남은 해결 처리 시각이다
    pool.query<{ error_id: string; at: Date | null }>(
      `SELECT x.error_id, COALESCE(x.prev_resolved_at, e.resolved_at) AS at FROM stab_run_error x JOIN stab_error e ON e.id = x.error_id
        WHERE x.run_id = $1 AND x.error_id = ANY($2)`,
      [runId, 번호들],
    ),
    pool.query<{ error_id: string; text: string }>('SELECT DISTINCT ON (error_id) error_id, text FROM stab_sample WHERE error_id = ANY($1) ORDER BY error_id, ord', [번호들]),
    pool.query<{ error_id: string; tc_id: string; seq: number | null }>(
      'SELECT DISTINCT error_id, tc_id, seq FROM stab_occurrence WHERE run_id = $1 AND error_id = ANY($2) ORDER BY error_id, tc_id, seq',
      [runId, 번호들],
    ),
    pool.query<{ id: string; title: string }>('SELECT id, title FROM stab_error WHERE confirmed_run_id = $1 ORDER BY id', [runId]),
    pool.query<{ tc_id: string; tc_name: string }>('SELECT DISTINCT ON (tc_id) tc_id, tc_name FROM run_item WHERE run_id = ANY($1) ORDER BY tc_id, history_id DESC LIMIT $2', [
      run.runIds,
      재료케이스상한 + 1,
    ]),
  ]);
  const 시각 = new Map(해결시각.rows.map((r) => [Number(r.error_id), r.at?.toISOString() ?? null]));
  const 견본글 = new Map(견본.rows.map((r) => [Number(r.error_id), r.text.slice(0, 견본앞자)]));
  const 발생들 = new Map<number, { tcId: string; seq: number | null }[]>();
  for (const r of 발생.rows) {
    const 줄 = 발생들.get(Number(r.error_id)) ?? [];
    줄.push({ tcId: r.tc_id, seq: r.seq });
    발생들.set(Number(r.error_id), 줄);
  }

  const 재료 = {
    runId,
    day: run.day,
    env: run.env,
    buildNo: run.buildNo,
    numbers: {
      cases: run.cases,
      errorCases: run.errorCases,
      passErrorCases: run.passErrorCases,
      crashes: run.crashes,
      residual: run.residual,
      newErrors: run.newErrors,
      resolved: run.resolved,
      confirmed: run.confirmed,
    },
    previous: run.previous,
    errors: 종류.map((e) => {
      const 줄 = 발생들.get(e.id) ?? [];
      return {
        errorId: e.id,
        title: e.title,
        state: e.state,
        cases: e.cases,
        previousCases: e.previousCases,
        firstDay: e.firstDay,
        firstBuildNo: e.firstBuildNo,
        resolvedAt: 시각.get(e.id) ?? null,
        sample: 견본글.get(e.id) ?? null,
        occurrences: 줄.slice(0, 종류발생상한),
        occurrencesTruncated: 줄.length > 종류발생상한,
      };
    }),
    confirmed: 확인.rows.map((r) => ({ errorId: Number(r.id), title: r.title })),
    trend: trend.map(({ day, residual, newErrors, buildNo }) => ({ day, residual, newErrors, buildNo })),
    cases: 케이스.rows.slice(0, 재료케이스상한).map((r) => ({ tcId: r.tc_id, name: r.tc_name })),
    truncated: { errors: 보기.errors.length > 재료종류상한, cases: 케이스.rows.length > 재료케이스상한 },
  };
  await pool.query('UPDATE perf_ai_job SET input = $2 WHERE id = $1', [jobId, JSON.stringify(재료)]);
  return { input: 재료 };
}
