// 한 건 실행 — 붙을 실행 고르기와 지금 결과로 바꿔 끼우기 (도메인/실행 §3.2 「★ 한 건 실행은 묶음 실행에 붙는다」)

import type { Pool, PoolClient } from 'pg';

type 질의 = Pick<PoolClient, 'query'>;

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

/**
 * 지금 결과로 본 run_item — 원래 항목 자리에 그 실행에 붙어 판정이 난 한 건 항목 가운데 가장 늦게 끝난 것을 끼운다.
 * 바꿔 낀 행도 run_id 는 원래 실행이라 바깥 질의는 run_item 자리에 그대로 둔다. **세는 질의는 모두 이 한 곳을 거친다.**
 *
 * 조건은 원래 항목 `o` 에 건다 — 바깥에서 run_id 로 거르면 바꿔 낀 행에서 나온 칸이라 색인을 못 타고 표를 다 훑는다.
 * 바깥 행을 보는 조건(`o.run_id = r.run_id`)이면 `LATERAL` 로 잇는다.
 * 덮였으면 rerun_* · orig_* 칸이 차고 아니면 NULL 이다. 미실행으로 끝난 한 건은 덮지 않는다 — 실패가 미실행으로 가려지면 안 된다
 */
export const 지금항목 = (조건: string): string => `(
  SELECT (n.r).*, d.run_id AS rerun_run_id, d.finished_at AS rerun_finished_at, d.누가 AS rerun_by,
         CASE WHEN d.run_id IS NULL THEN NULL ELSE o.history_id END AS orig_history_id,
         CASE WHEN d.run_id IS NULL THEN NULL ELSE o.status END AS orig_status,
         CASE WHEN d.run_id IS NULL THEN NULL ELSE o.finished_at END AS orig_finished_at
    FROM run_item o
    LEFT JOIN LATERAL (
      SELECT s AS r, s.finished_at, sr.run_id, COALESCE(NULLIF(sr.triggered_by_name, ''), sr.triggered_by) AS 누가
        FROM test_run sr JOIN run_item s ON s.run_id = sr.run_id
       WHERE sr.origin = 'SINGLE' AND sr.rerun_of = o.run_id
         AND s.tc_id = o.tc_id AND s.platform = o.platform
         AND s.finished_at IS NOT NULL AND s.status IN ('PASS', 'FAIL')
       ORDER BY s.finished_at DESC, s.history_id DESC
       LIMIT 1
    ) d ON true
    CROSS JOIN LATERAL (
      SELECT CASE WHEN d.run_id IS NULL THEN o ELSE jsonb_populate_record(d.r, jsonb_build_object('run_id', o.run_id)) END AS r
    ) n
   WHERE ${조건})`;

/** 덮인 항목에 붙는 칸 (도메인/실행 §7 `GET /api/runs/:runId` items[].rerun) */
export interface 다시실행칸 {
  runId: number;
  finishedAt: string;
  triggeredBy: string;
  original: { historyId: number; status: string; finishedAt: string | null };
}

/** 지금항목 이 더하는 칸 — 다시실행칸으로 가 읽는다 */
export const 다시실행칸들 = 'i.rerun_run_id, i.rerun_finished_at, i.rerun_by, i.orig_history_id, i.orig_status, i.orig_finished_at';

export interface 다시실행원재료 {
  rerun_run_id: string | null;
  rerun_finished_at: Date | null;
  rerun_by: string | null;
  orig_history_id: string | null;
  orig_status: string | null;
  orig_finished_at: Date | null;
}

export function 다시실행칸으로(row: 다시실행원재료): 다시실행칸 | null {
  if (row.rerun_run_id === null) return null;
  return {
    runId: Number(row.rerun_run_id),
    finishedAt: row.rerun_finished_at!.toISOString(),
    triggeredBy: row.rerun_by ?? '',
    original: {
      historyId: Number(row.orig_history_id),
      status: row.orig_status!,
      finishedAt: row.orig_finished_at === null ? null : row.orig_finished_at.toISOString(),
    },
  };
}

/** 케이스 하나 · 반복 1 이면 한 건이다 — 디바이스 수와 거는 곳은 상관없다 */
export function 한건인가(tcIds: string[], repeat: number): boolean {
  return new Set(tcIds).size === 1 && repeat === 1;
}

/** 회차가 둘 이상인 실행 — 붙이면 회차 요약의 「5회 중 2회 실패」가 지워진다 */
export async function 반복실행인가(client: 질의, runId: number): Promise<boolean> {
  const r = await client.query('SELECT 1 FROM run_item WHERE run_id = $1 AND attempt > 1 LIMIT 1', [runId]);
  return (r.rowCount ?? 0) > 0;
}

export interface 붙을곳 {
  runId: number;
  title: string;
  startedAt: string;
}

/**
 * 같은 대상 서버에서 그 케이스의 고른 디바이스 항목이 하나라도 있는 끝난 실행 가운데 시작이 가장 늦은 것.
 * 빌드 스모크 · 한 건 실행 · 시나리오 실행(항목이 없다)은 후보가 아니다. 고른 것이 반복 실행이면 그 앞으로 내려가지 않고 null —
 * 더 낡은 실행을 고치게 된다. 실행을 만드는 쪽과 실행 창의 「결과가 남는 곳」이 같은 함수를 쓴다
 */
export async function 붙을곳고르기(
  client: 질의,
  재료: { serviceId: string; env: string; tcId: string; platforms: string[] },
): Promise<붙을곳 | null> {
  const r = await client.query<{ run_id: string; title: string; started_at: Date }>(
    `SELECT r.run_id, r.title, r.started_at
       FROM test_run r
      WHERE r.service_id = $1 AND r.env = $2 AND r.status IN ('FINISHED', 'ABORTED')
        AND r.origin <> 'SINGLE' AND r.build_stage IS DISTINCT FROM 'SMOKE'
        AND EXISTS (SELECT 1 FROM run_item i WHERE i.run_id = r.run_id AND i.tc_id = $3 AND i.platform = ANY($4::text[]))
      ORDER BY r.started_at DESC, r.run_id DESC
      LIMIT 1`,
    [재료.serviceId, 재료.env, 재료.tcId, 재료.platforms],
  );
  const 것 = r.rows[0];
  if (것 === undefined || (await 반복실행인가(client, Number(것.run_id)))) return null;
  return { runId: Number(것.run_id), title: 것.title, startedAt: 것.started_at.toISOString() };
}

/**
 * 실행을 만들 때 시작 방식과 붙는 곳을 정한다. 고르는 때는 만들 때이고 박제한다 — 도는 사이 새 실행이 끝나도 바꾸지 않는다.
 * rerunOf 를 실은 한 건은 그 실행에 붙는다. 그 실행이 반복 실행이면 원래 카드의 「RUN N에서 통과」가 이어지게 지금처럼 RERUN 새 실행이다
 */
export async function 시작방식정하기<기본 extends string>(
  client: 질의,
  재료: { origin: 기본; rerunOf?: number; tcIds: string[]; repeat: number; serviceId: string; env: string; platforms: string[] },
): Promise<{ origin: 기본 | 'RERUN' | 'SINGLE'; rerunOf: number | null; attachedTo: number | null }> {
  const 다시 = 재료.rerunOf;
  // 정기 실행 · 빌드 실행은 서버 안에서 만들어 이 규칙 밖이다 — 사람이 실행 창에서 건 것만 한 건이다
  if (재료.origin !== 'MANUAL' || !한건인가(재료.tcIds, 재료.repeat)) {
    return 다시 === undefined ? { origin: 재료.origin, rerunOf: null, attachedTo: null } : { origin: 'RERUN', rerunOf: 다시, attachedTo: null };
  }
  if (다시 !== undefined) {
    return (await 반복실행인가(client, 다시))
      ? { origin: 'RERUN', rerunOf: 다시, attachedTo: null }
      : { origin: 'SINGLE', rerunOf: 다시, attachedTo: 다시 };
  }
  const 곳 = await 붙을곳고르기(client, { serviceId: 재료.serviceId, env: 재료.env, tcId: 재료.tcIds[0]!, platforms: 재료.platforms });
  return { origin: 'SINGLE', rerunOf: 곳?.runId ?? null, attachedTo: 곳?.runId ?? null };
}

/**
 * 실행 창의 「결과가 남는 곳」 — 지금 이 케이스 한 건을 걸면 붙을 실행 (도메인/실행 §7 `rerun-target`).
 * 모르는 대상 서버 · 선언 밖 디바이스는 실행을 걸 때처럼 거절한다 — 걸지 못할 실행의 붙을 곳을 말하지 않는다
 */
export async function 붙을실행(tcId: string, env: string, platforms: string[]): Promise<{ target: 붙을곳 | null } | { error: string }> {
  const pool = await db();
  const r = await pool.query<{ service_id: string; platforms: string[]; env: string | null }>(
    `SELECT s.id AS service_id, c.platforms, e.env
       FROM test_case c
       JOIN service s ON s.prefix = split_part(c.tc_id, '-', 1)
       LEFT JOIN service_env e ON e.service_id = s.id AND e.env = $2
      WHERE c.tc_id = $1`,
    [tcId, env],
  );
  const 것 = r.rows[0];
  if (것 === undefined) return { error: `카탈로그에 없는 케이스다: ${tcId}` };
  if (것.env === null) return { error: `대상 서버 ${env} 가 없다` };
  if (platforms.length === 0 || platforms.some((p) => !것.platforms.includes(p))) return { error: `${tcId} 가 선언하지 않은 디바이스가 있다` };
  return { target: await 붙을곳고르기(pool, { serviceId: 것.service_id, env, tcId, platforms }) };
}
