// 실행 목록 줄의 직전 대비 수 — 쪽에 든 실행과 그 앞 실행들을 한 번에 읽어 센다 (SPEC 도메인/실행 §7 `GET /api/runs` change)

import { 지금항목 } from '../execution/single.js';
import { 스모크건너뛰기식, 판정접기식 } from './dashboardSql.js';
import { db, 케이스판정들, type 접힌행 } from './insights.js';

export type 직전대비 = { newFail: number; stillFail: number; fixed: number };

/**
 * 직전 실행 고르기는 compareWithPrevious 와 같다 — 같은 서비스 · 대상 서버 · 종류에서 더 일찍 시작해 끝난 실행(스모크 아닌 실행은 스모크를 건너뛴다).
 * 이번 실행이 도는 중이거나 견줄 앞이 없으면 맵에 없다(화면에는 null).
 * 큰 수는 케이스 수다 — 디바이스를 접는다. 결과 화면 요약 띠(web/RunSummary.tsx 칸수)와 같은 단위다
 */
export async function 직전대비수(runIds: number[]): Promise<Map<number, 직전대비>> {
  if (runIds.length === 0) return new Map();
  const pool = await db();
  const 짝 = await pool.query<{ run_id: string; prev_id: string }>(
    `SELECT r.run_id, p.run_id AS prev_id
       FROM test_run r
       CROSS JOIN LATERAL (
         SELECT q.run_id FROM test_run q
          WHERE q.service_id = r.service_id AND q.env = r.env AND q.started_at < r.started_at
            AND q.status <> 'RUNNING' AND q.kind = r.kind AND ${스모크건너뛰기식('q', 'r')}
          ORDER BY q.started_at DESC
          LIMIT 1) p
      WHERE r.run_id = ANY($1::bigint[]) AND r.status <> 'RUNNING' AND r.kind IN ('UI','FN')`,
    [runIds],
  );
  if (짝.rows.length === 0) return new Map();

  const 읽을것 = [...new Set(짝.rows.flatMap((r) => [r.run_id, r.prev_id]))];
  const 접힘 = await pool.query<접힌행 & { run_id: string }>(
    `SELECT i.run_id, i.tc_id, max(i.tc_name) AS tc_name, i.platform, ${판정접기식} AS status
       FROM ${지금항목('o.run_id = ANY($1::bigint[])')} i
      GROUP BY i.run_id, i.tc_id, i.platform`,
    [읽을것],
  );
  const 실행마다 = new Map<string, 접힌행[]>();
  for (const row of 접힘.rows) {
    const 줄들 = 실행마다.get(row.run_id);
    if (줄들 === undefined) 실행마다.set(row.run_id, [row]);
    else 줄들.push(row);
  }

  const 결과 = new Map<number, 직전대비>();
  for (const { run_id, prev_id } of 짝.rows) {
    const { 케이스들 } = 케이스판정들(실행마다.get(prev_id) ?? [], 실행마다.get(run_id) ?? []);
    const 센다 = (판정: string) => new Set(케이스들.filter((c) => c.판정 === 판정).map((c) => c.tcId)).size;
    결과.set(Number(run_id), { newFail: 센다('새로깨짐'), stillFail: 센다('계속깨짐'), fixed: 센다('고쳐짐') });
  }
  return 결과;
}
