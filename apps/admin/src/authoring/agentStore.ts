// 작성 에이전트가 부르는 대기줄 쓰기 — 집기 · 되돌리기 · 단계(진척) · 사진 자리 · 끝내기 (도메인/작성 §7). store.ts 가 300줄을 넘어 뗐다

import { db, 빚기, 칸들, type 요청, type 행 } from './store.js';

/**
 * 줄에서 한 건 집어 간다.
 *
 * **한 줄 UPDATE 가 곧 잠금이다.** `WHERE status = 'PENDING'` 이 붙은 한 문장이라
 * 둘이 동시에 불러도 하나만 바꾼다. **먼저 읽고 나중에 고치는 두 문장으로 쓰면 둘이 같은 행을 집는다.**
 *
 * **그 서비스 것만 집는다** — 안 거르면 남의 서비스 행을 집어 주고, 그 행에는
 * `spec_text` 가 기획서 본문 통째로 실려 있다 (도메인/작성 §7).
 */
export async function 집기(서비스: number, 집는이: string): Promise<요청 | null> {
  const pool = await db();
  const r = await pool.query<행>(
    `UPDATE authoring_request
        SET status = 'RUNNING', claimed_by = $2, started_at = now()
      WHERE id = (
              SELECT id FROM authoring_request
               WHERE service_id = $1 AND status = 'PENDING'
               ORDER BY id
               LIMIT 1
            )
        AND status = 'PENDING'
      RETURNING ${칸들}`,
    [서비스, 집는이],
  );
  const row = r.rows[0];
  return row === undefined ? null : 빚기(row);
}

/**
 * 집은 것을 줄로 되돌린다. 집은 사람 것만.
 *
 * 집기가 행을 RUNNING 으로 커밋한 뒤 응답을 채우다 던지면 맥은 500 만 받고 번호를 모른다.
 * 되돌리지 않으면 그 행은 아무도 안 끝내는 RUNNING 으로 영원히 남는다.
 */
export async function 집기되돌리기(id: number, 집는이: string): Promise<boolean> {
  const pool = await db();
  const r = await pool.query(
    `UPDATE authoring_request
        SET status = 'PENDING', claimed_by = NULL, started_at = NULL
      WHERE id = $1 AND status = 'RUNNING' AND claimed_by = $2`,
    [id, 집는이],
  );
  return r.rowCount === 1;
}

/**
 * 작업 단계를 올린다. 도는 중인 행에만 붙는다 — 아니면 false 를 주고 라우트가 409 를 낸다.
 * 진척이 없으면 자식이 끝났다는 뜻이라 childRunning 만 내린다. 아직 NULL(자식 전)이면 그대로 둔다 —
 * 반쪽 진척을 만들면 화면이 빈 칸을 그린다. stop 은 멈춤 요청이 있고 자식 전이거나 자식이 도는 중일 때 참 (§7)
 */
export async function 단계올리기(
  id: number,
  단계: string,
  진척?: Record<string, unknown>,
): Promise<false | { stop: boolean }> {
  const pool = await db();
  const r = await pool.query<{ stop: boolean }>(
    `UPDATE authoring_request
        SET stage = $2, stage_at = now(),
            progress = COALESCE($3::jsonb, progress || '{"childRunning": false}'::jsonb)
      WHERE id = $1 AND status = 'RUNNING'
      RETURNING (stop_requested_at IS NOT NULL
                 AND (progress IS NULL OR progress->>'childRunning' = 'true')) AS stop`,
    [id, 단계, 진척 === undefined ? null : JSON.stringify(진척)],
  );
  const 행 = r.rows[0];
  return 행 === undefined ? false : { stop: 행.stop };
}

/** 사진 폴더를 적어 둔다. 도는 중인 행에만 붙는다 */
export async function 사진자리적기(id: number, 자리: string): Promise<boolean> {
  const pool = await db();
  const r = await pool.query(
    `UPDATE authoring_request
        SET screenshot_dir = $2
      WHERE id = $1 AND status = 'RUNNING'`,
    [id, 자리],
  );
  return r.rowCount === 1;
}

/**
 * 끝났다고 알린다. **도는 중인 행에만 붙는다** — 끝난 행에 또 오면 false 다.
 * 안 막으면 판정과 PR 주소가 덮어써진다 (2026-09-22 검토가 잡았다).
 */
export async function 끝내기(
  id: number,
  결과: {
    status: 'DONE' | 'FAILED' | 'STOPPED';
    // STOPPED 일 때만. USER 면 멈춤을 요청한 사람이, 그 밖이면 system 이 멈춘 사람이다 (§7)
    stopReason?: string;
    result?: unknown;
    testSource?: unknown;
    prUrl?: string;
    error?: string;
  },
): Promise<boolean> {
  const pool = await db();
  const r = await pool.query(
    `UPDATE authoring_request
        SET status = $2,
            result = COALESCE($3::jsonb, result),
            test_source = COALESCE($4::jsonb, test_source),
            pr_url = COALESCE($5, pr_url),
            error = COALESCE($6, error),
            stop_reason = $7::text,
            stopped_by = CASE WHEN $7::text IS NULL THEN NULL WHEN $7::text = 'USER' THEN stop_requested_by ELSE 'system' END,
            finished_at = now()
      WHERE id = $1 AND status = 'RUNNING'`,
    [
      id,
      결과.status,
      결과.result === undefined ? null : JSON.stringify(결과.result),
      결과.testSource === undefined ? null : JSON.stringify(결과.testSource),
      결과.prUrl ?? null,
      결과.error ?? null,
      결과.stopReason ?? null,
    ],
  );
  return r.rowCount === 1;
}
