// 실행 항목의 결과를 되쓰고 실행 묶음을 닫는다 — 항목 완료 · 중단 · 재기동 복구 (SPEC §3.2 · §7)

import type { ExecuteResponse, Platform, StepResult } from '@platform/kit';

import type { Pool } from 'pg';

import { 게임결과를넣는다 } from './gameResult.js';

// DATABASE_URL이 없으면 db/index.ts가 import 시점에 던진다. 풀은 실제로 쓸 때 가져온다 (catalog/store.ts와 같은 방식)
async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

const INSERT_STEP = `
  INSERT INTO run_item_step (history_id, seq, title, status, duration_ms, assertions, line, screenshot_path, http_trace, error, shape_checks)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  ON CONFLICT (history_id, seq) DO NOTHING`;

function stepValues(historyId: number, step: StepResult): unknown[] {
  return [
    historyId,
    step.seq,
    step.title,
    step.status,
    step.durationMs,
    JSON.stringify(step.assertions),
    step.line ?? null,
    step.screenshotPath ?? null,
    step.httpTrace === undefined ? null : JSON.stringify(step.httpTrace),
    step.error === undefined ? null : JSON.stringify(step.error),
    step.shapeChecks === undefined ? null : JSON.stringify(step.shapeChecks),
  ];
}

// API × 응답 코드 사본 (도메인/API §3.8 「API 커버리지」). 케이스의 줄은 그 실행의 애플리케이션 것만 건드린다
const API호출지우기 = `
  DELETE FROM api_call_seen a USING run_item i JOIN test_run r ON r.run_id = i.run_id
   WHERE i.history_id = $1 AND a.service_id = r.service_id AND a.tc_id = i.tc_id`;
const API호출넣기 = `
  INSERT INTO api_call_seen (service_id, tc_id, method, path, status, no_shape, run_id)
  SELECT r.service_id, i.tc_id, x.method, x.path, x.status, x.no_shape, i.run_id
    FROM run_item i JOIN test_run r ON r.run_id = i.run_id,
         jsonb_to_recordset($2::jsonb) AS x(method text, path text, status int, no_shape boolean)
   WHERE i.history_id = $1
  ON CONFLICT (service_id, tc_id, method, path, status) DO UPDATE SET no_shape = EXCLUDED.no_shape, run_id = EXCLUDED.run_id, seen_at = now()`;

/** 받은 API × 응답 코드. 같은 것을 여러 번 불렀어도 한 줄이다 */
export function 받은API(steps: readonly StepResult[]): { method: string; path: string; status: number; no_shape: boolean }[] {
  const 줄 = new Map<string, { method: string; path: string; status: number; no_shape: boolean }>();
  for (const c of steps.flatMap((s) => s.shapeChecks ?? [])) {
    줄.set(`${c.method} ${c.path} ${c.status}`, { method: c.method, path: c.path, status: c.status, no_shape: c.result === 'NO_SHAPE' });
  }
  return [...줄.values()];
}

export async function finishItem(historyId: number, result: ExecuteResponse): Promise<void> {
  const client = await (await db()).connect();
  try {
    await client.query('BEGIN');
    // 아래 CLOSE_UNFINISHED와 같은 규칙이다 — 닫는 UPDATE에는 언제나 AND finished_at IS NULL 을 붙인다.
    // 사람이 멈춘 직후에는 그 항목의 러너 호출이 이미 나가 있어 응답이 뒤늦게 도착한다
    const closed = await client.query(
      'UPDATE run_item SET status = $2, duration_ms = $3, error = $4, device = $5, finished_at = now() WHERE history_id = $1 AND finished_at IS NULL',
      [
        historyId,
        result.status,
        result.durationMs,
        result.error === undefined ? null : JSON.stringify(result.error),
        // 객체가 아니면 칸 제약에 걸려 판정 · 절차까지 되돌려진다 — 곁들이는 값만 버린다
        typeof result.device === 'object' && result.device !== null && !Array.isArray(result.device) ? JSON.stringify(result.device) : null,
      ],
    );
    if (closed.rowCount === 0) {
      // 먼저 닫힌 쪽이 이긴다. 절차 기록도 넣지 않는다 — 묶음은 ABORTED인데 절차만 PASS로 쌓이면 증적이 어긋난다
      await client.query('ROLLBACK');
      return;
    }
    for (const step of result.steps) {
      await client.query(INSERT_STEP, stepValues(historyId, step));
    }
    // 통과면 그 케이스 줄을 이번 것으로 갈아 끼운다 — 케이스를 고쳐 더 안 부르는 API 가 남지 않게.
    // 실패면 지운다 — 깨진 케이스가 지난 통과로 덮은 것처럼 남지 않게. 미실행은 알 수 없어 그대로 둔다
    if (result.status !== 'NA') {
      await client.query(API호출지우기, [historyId]);
      const 받은것 = result.status === 'PASS' ? 받은API(result.steps) : [];
      if (받은것.length > 0) await client.query(API호출넣기, [historyId, JSON.stringify(받은것)]);
    }
    await 게임결과를넣는다(client, historyId, result);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// 모든 항목이 끝나야 FINISHED다 (SPEC §3.2). 그 조건을 SQL에 박아 부르는 쪽이 세지 않게 한다
// 닫는 UPDATE에는 언제나 AND finished_at IS NULL 을 붙인다. 중단 처리와 러너 응답이 겹칠 수 있고,
// 조건이 없으면 나중에 온 쪽이 먼저 기록된 판정을 덮어쓴다 (SPEC §7.1)
const CLOSE_UNFINISHED = `
  UPDATE run_item
     SET status = 'NA', finished_at = now(), duration_ms = COALESCE(duration_ms, 0),
         error = jsonb_build_object('message', $2::text)
   WHERE run_id = $1 AND finished_at IS NULL`;

// 케이스 쪽 CLOSE_UNFINISHED 와 같은 조건이다 — 먼저 온 기록을 덮지 않는다
const CLOSE_UNFINISHED_PARTS = `
  UPDATE scenario_run_part
     SET status = 'NA', finished_at = now(), duration_ms = COALESCE(duration_ms, 0),
         error = jsonb_build_object('message', 'ABORTED')
   WHERE run_id = $1 AND finished_at IS NULL`;

export interface AbortResult {
  aborted: number;
}

// 이미 끝났거나 이미 멈춘 실행은 다시 멈출 수 없다. 그 사실을 부르는 쪽이 409로 알린다 (SPEC §7)
// 시나리오 실행은 러너에 끊을 통로가 없어 DB 만 닫으면 러너는 계속 돈다. 그래서 따로 거절한다 (SPEC 실행 §7)
export async function abortRun(runId: number): Promise<AbortResult | null | 'SCENARIO'> {
  const client = await (await db()).connect();
  try {
    await client.query('BEGIN');

    const run = await client.query<{ status: string; kind: string }>(
      "SELECT status, kind FROM test_run WHERE run_id = $1 FOR UPDATE",
      [runId],
    );
    if (run.rows[0]?.kind === 'SCENARIO') {
      await client.query('ROLLBACK');
      return 'SCENARIO';
    }
    if (run.rows[0]?.status !== 'RUNNING') {
      await client.query('ROLLBACK');
      return null;
    }

    const closed = await client.query(CLOSE_UNFINISHED, [runId, 'ABORTED']);
    // 끝까지 돌아서 끝난 것과 사람이 끊어서 끝난 것은 증적에서 구분돼야 한다 (SPEC §3.2)
    await client.query("UPDATE test_run SET status = 'ABORTED', finished_at = now() WHERE run_id = $1", [runId]);

    await client.query('COMMIT');
    return { aborted: closed.rowCount ?? 0 };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// 아직 끝나지 않은 항목의 historyId. 러너에 끊어 달라고 할 대상이다 (SPEC §5.2).
// 대기 중인지 도는 중인지 DB로는 갈리지 않으므로 전부에 보낸다 — 러너가 모르는 것은 false를 돌려준다.
// platform 은 맡은 러너를 고르는 데 쓴다 (SPEC 실행 §7)
export async function unfinishedItems(runId: number): Promise<{ historyId: number; platform: Platform }[]> {
  const pool = await db();
  const rows = await pool.query<{ history_id: string; platform: Platform }>(
    'SELECT history_id, platform FROM run_item WHERE run_id = $1 AND finished_at IS NULL',
    [runId],
  );
  return rows.rows.map((r) => ({ historyId: Number(r.history_id), platform: r.platform }));
}

// 재기동으로 분배기가 사라지면 그 항목들은 영원히 끝나지 않아 FINISHED 조건이 결코 만족되지 않는다.
// 부팅 직후 한 번 닫는다 (SPEC §3.2)
export async function recoverRunning(): Promise<number> {
  const pool = await db();
  const running = await pool.query<{ run_id: string }>("SELECT run_id FROM test_run WHERE status = 'RUNNING'");
  for (const row of running.rows) {
    // 시나리오 실행의 부품도 닫는다 (SPEC 실행 §3.2). 실행보다 먼저 — 여기서 죽어도 실행이 RUNNING 으로 남아
    // 다음 기동이 다시 집는다. duration_ms 는 CLOSE_UNFINISHED 와 맞춘다 — 같은 마감이 두 표에서 다르게 보이지 않게
    await pool.query(CLOSE_UNFINISHED_PARTS, [Number(row.run_id)]);
    await pool.query(CLOSE_UNFINISHED, [Number(row.run_id), 'ABORTED']);
    // 위 SELECT 뒤에 러너가 막 FINISHED 로 닫았을 수 있다. 끝까지 돈 실행을 ABORTED 로 덮지 않는다
    await pool.query(
      "UPDATE test_run SET status = 'ABORTED', finished_at = now() WHERE run_id = $1 AND status = 'RUNNING'",
      [Number(row.run_id)],
    );
  }
  return running.rowCount ?? 0;
}

export async function finishRun(runId: number): Promise<void> {
  const pool = await db();
  await pool.query(
    `UPDATE test_run SET status = 'FINISHED', finished_at = now()
      WHERE run_id = $1
        AND status = 'RUNNING'
        AND NOT EXISTS (SELECT 1 FROM run_item WHERE run_id = $1 AND finished_at IS NULL)`,
    [runId],
  );
}
