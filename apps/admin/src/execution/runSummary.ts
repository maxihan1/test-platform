// 실행 기록 화면의 거르개와 머리 집계 (SPEC §8.7). queries.ts 가 300줄을 넘어 떼어 냈다 — 목록 질의와 집계가 같은 거르개를 쓴다

import type { Pool } from 'pg';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

/**
 * 실행 목록의 거르개 (SPEC §8.7).
 *
 * **`state` 는 `test_run.status` 가 아니다.** `failed` 는 「실패 항목이 하나라도 있는 실행」이라
 * 집계에서 나오고, 그래서 `HAVING` 으로 걸린다. 칸 하나를 보는 것이 아니다.
 */
export interface 실행거르개 {
  q?: string;
  state?: 'running' | 'failed';
  env?: string;
}

/**
 * `WHERE` 와 `HAVING` 을 같이 만든다.
 *
 * **목록 질의와 집계 질의가 같은 함수를 쓴다.** 두 벌이면 거르개를 걸었을 때
 * 「보이는 것」과 「세는 것」이 갈려, 3줄만 보이는 화면이 「42회」라고 말하게 된다.
 */
export function 거르는조건(거르개: 실행거르개, 시작번호: number): { where: string; having: string; 값: unknown[] } {
  const where: string[] = [];
  const 값: unknown[] = [];
  let n = 시작번호;

  if (거르개.q !== undefined && 거르개.q !== '') {
    where.push(`r.title ILIKE $${String(n)}`);
    // ILIKE 특수문자를 값으로 다룬다. 사람이 친 % 가 전체 일치로 바뀌지 않게 한다
    값.push(`%${거르개.q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`);
    n += 1;
  }
  if (거르개.env !== undefined && 거르개.env !== '') {
    where.push(`r.env = $${String(n)}`);
    값.push(거르개.env);
  }
  // 도는 것은 칸으로 갈리지만 실패 섞임은 집계로 갈린다. 그래서 둘이 다른 절에 붙는다
  if (거르개.state === 'running') where.push(`r.finished_at IS NULL`);
  const having =
    거르개.state === 'failed'
      ? `HAVING count(i.history_id) FILTER (WHERE i.finished_at IS NOT NULL AND i.status = 'FAIL') > 0`
      : '';

  return { where: where.length === 0 ? '' : `AND ${where.join(' AND ')}`, having, 값 };
}

/**
 * 실행 기록 화면 머리의 집계 (SPEC §8.7).
 *
 * **거르개를 건 뒤의 집합을 센다.** 전체를 세면 3줄만 보이는 화면이 「42회」라고 말한다.
 */
export interface 실행집계 {
  runs: number;
  /** 실패도 미실행도 없는 실행 */
  allPass: number;
  /** 실패 항목이 하나라도 있는 실행 */
  hasFail: number;
  /** 평균을 낸 실행 수. 도는 실행은 소요가 없어 빠진다 — 몇 회를 셌는지 화면이 적는다 */
  durationOf: number;
  avgDurationMs: number;
  maxDurationMs: number;
}

/**
 * 집계는 쪽을 안 탄다. 목록과 **같은 거르개 함수**를 써서 둘이 갈라지지 않게 한다.
 *
 * 한 실행이 「모두 통과」인지는 항목 집계에서 나오므로 실행마다 한 번 접고 그것을 다시 센다.
 */
export async function runSummary(service: string, 거르개: 실행거르개): Promise<실행집계> {
  const pool = await db();
  const 조건 = 거르는조건(거르개, 2);
  const { rows } = await pool.query<{
    runs: number;
    all_pass: number;
    has_fail: number;
    duration_of: number;
    avg_duration_ms: number | null;
    max_duration_ms: number | null;
  }>(
    `SELECT count(*)::int AS runs,
            count(*) FILTER (WHERE fail = 0 AND na = 0 AND running = 0 AND total > 0)::int AS all_pass,
            count(*) FILTER (WHERE fail > 0)::int AS has_fail,
            count(duration)::int AS duration_of,
            avg(duration)::int AS avg_duration_ms,
            max(duration)::int AS max_duration_ms
       FROM (
         SELECT count(i.history_id) FILTER (WHERE i.finished_at IS NOT NULL AND i.status = 'FAIL')::int AS fail,
                count(i.history_id) FILTER (WHERE i.finished_at IS NOT NULL AND i.status = 'NA')::int AS na,
                count(i.history_id) FILTER (WHERE i.finished_at IS NULL)::int AS running,
                count(i.history_id)::int AS total,
                -- 도는 실행은 끝난 시각이 없다. NULL 이면 avg·count 가 알아서 뺀다
                extract(epoch FROM (r.finished_at - r.started_at)) * 1000 AS duration
           FROM test_run r
           LEFT JOIN run_item i USING (run_id)
          WHERE r.service_id = (SELECT id FROM service WHERE prefix = $1) ${조건.where}
          GROUP BY r.run_id, r.started_at, r.finished_at
          ${조건.having}
       ) 실행마다`,
    [service, ...조건.값],
  );

  const 것 = rows[0];
  return {
    runs: 것?.runs ?? 0,
    allPass: 것?.all_pass ?? 0,
    hasFail: 것?.has_fail ?? 0,
    durationOf: 것?.duration_of ?? 0,
    avgDurationMs: 것?.avg_duration_ms ?? 0,
    maxDurationMs: 것?.max_duration_ms ?? 0,
  };
}
