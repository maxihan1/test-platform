// 케이스 실행 증적 끝의 「E2E 요약」 — 그 서비스의 치우지 않은 시나리오마다 마지막으로 끝난 실행 한 줄 (도메인/리포팅 §8.4 「E2E 시나리오 증적」)
// 케이스 실행 안에는 시나리오가 없어 다른 실행을 읽는다. 그래서 증적을 만든 그 시점의 값이고 문서에 그렇게 적는다

import type { ItemStatus } from '@platform/kit';

import { 미확정SQL, 접은판정SQL } from '../scenario/verdict.js';

export interface E2E요약줄 {
  scenarioId: number;
  name: string;
  /** 마지막으로 끝난 실행의 시작 시각. null 이면 한 번도 안 돌렸다 */
  startedAt: string | null;
  verdict: ItemStatus | null;
  /** 처음으로 통과가 아닌 단계 번호. 전부 통과면 null (실행 기록 E2E 줄의 「멈춘 단계」와 같다) */
  stoppedAt: number | null;
  unconfirmed: boolean;
}

export async function E2E요약(runId: number): Promise<E2E요약줄[]> {
  const { pool } = await import('../db/index.js');
  // 도는 중인 실행은 부품이 아직 전부 NA 라 판정을 모른다 — 끝난(멈춘 것 포함) 것 중 마지막만 본다
  const rows = await pool.query<{
    id: string;
    name: string;
    started_at: Date | null;
    verdict: ItemStatus;
    stopped_at: number | null;
    unconfirmed: boolean;
  }>(
    `SELECT s.id, s.name, r.started_at, ${접은판정SQL('p')} AS verdict,
            MIN(p.seq) FILTER (WHERE p.status <> 'PASS') AS stopped_at, ${미확정SQL('p')} AS unconfirmed
       FROM scenario s
       LEFT JOIN LATERAL (
         SELECT t.run_id, t.started_at FROM test_run t
          WHERE t.kind = 'SCENARIO' AND t.scenario_id = s.id AND t.status <> 'RUNNING'
          ORDER BY t.run_id DESC LIMIT 1) r ON true
       LEFT JOIN scenario_run_part p ON p.run_id = r.run_id
      WHERE s.is_active AND s.service_id = (SELECT service_id FROM test_run WHERE run_id = $1)
      GROUP BY s.id, s.name, r.run_id, r.started_at
      ORDER BY s.id`,
    [runId],
  );
  return rows.rows.map((r) => ({
    scenarioId: Number(r.id),
    name: r.name,
    startedAt: r.started_at?.toISOString() ?? null,
    verdict: r.started_at === null ? null : r.verdict,
    stoppedAt: r.started_at === null ? null : r.stopped_at,
    unconfirmed: r.started_at !== null && r.unconfirmed,
  }));
}
