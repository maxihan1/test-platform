// 추적표의 「성능 목표 · 최근 판정」 — 요구 번호마다 성능 목표 수와 가장 최근 판정 (도메인/성능 「성능 목표」 추적표 · 도메인/작성 §3.6)

export interface 요구성능 {
  targets: number;
  verdict: 'PASS' | 'FAIL' | null;
  runId: number | null;
}

/**
 * 그 애플리케이션의 지우지 않은 성능 시나리오 현재 버전 본문에서 근거가 「기획서」인 목표를 요구 번호로 센다.
 * 판정은 그 번호의 목표가 든 가장 최근 판정 있는 실행의 것이고, 그 번호 목표 중 하나라도 실패면 실패다
 */
export async function 성능목표읽기(서비스: number): Promise<Record<string, 요구성능>> {
  const { pool } = await import('../db/index.js');
  const 수 = await pool.query<{ req_id: string; n: string }>(
    `SELECT t->>'reqId' AS req_id, count(*) AS n
       FROM perf_scenario s
       JOIN perf_scenario_version v ON v.scenario_id = s.id AND v.version = s.version
       CROSS JOIN LATERAL jsonb_array_elements(COALESCE(v.body->'targets', '[]'::jsonb)) t
      WHERE s.service_id = $1 AND s.deleted_at IS NULL AND t->>'source' = 'PRD' AND t->>'reqId' IS NOT NULL
      GROUP BY 1`,
    [서비스],
  );
  const 최근 = await pool.query<{ req_id: string; run_id: string; fail: boolean }>(
    `SELECT DISTINCT ON (q.req_id) q.req_id, q.run_id, q.fail FROM (
       SELECT r.id AS run_id, t->>'reqId' AS req_id, bool_or(t->>'verdict' = 'FAIL') AS fail
         FROM perf_run r
         JOIN perf_scenario s ON s.id = r.scenario_id AND s.deleted_at IS NULL
         CROSS JOIN LATERAL jsonb_array_elements(r.targets) t
        WHERE r.service_id = $1 AND r.verdict IS NOT NULL AND r.targets IS NOT NULL AND t->>'source' = 'PRD' AND t->>'reqId' IS NOT NULL
        GROUP BY r.id, t->>'reqId') q
      ORDER BY q.req_id, q.run_id DESC`,
    [서비스],
  );
  const 판정 = new Map(최근.rows.map((x) => [x.req_id, x]));
  return Object.fromEntries(
    수.rows.map((x) => {
      const 최 = 판정.get(x.req_id);
      return [x.req_id, { targets: Number(x.n), verdict: 최 === undefined ? null : 최.fail ? 'FAIL' : 'PASS', runId: 최 === undefined ? null : Number(최.run_id) } satisfies 요구성능];
    }),
  );
}
