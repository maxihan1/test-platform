// 호환성 실행의 DB 쪽 — 실행 세우기 · 점검 상태 · 케이스 한 번 · 점검 화면 · 판정 · 중단 · 다시 켜기 정리 (도메인/호환성 §3.13 「실행」 · 데이터모델 「호환성 표」)

import { db } from '../settings/store.js';
import type { 상태줄, 케이스줄 } from './result.js';
import type { 점검상태, 화면줄 } from './uiCheck.js';

export class 호환성실행오류 extends Error {
  constructor(readonly code: 'ENV_NOT_FOUND' | 'NO_CASE' | 'NO_DEVICE' | 'FARM_OFF', message: string) {
    super(message);
  }
}

export interface 박제케이스 {
  tcId: string;
  name: string;
  picked: 'AUTO' | 'ADDED';
  filePath: string;
  timeoutMs: number;
}

/** test_run 한 줄 · 점검 상태마다 compat_run_device · 상태 × 케이스마다 compat_run_case 를 한 트랜잭션으로 세운다 */
export async function 실행세우기(
  set: { id: number; serviceId: number; name: string; devices: { serial: string; model: string; name: string }[] },
  env: string,
  사람: { username: string; displayName: string },
  케이스들: readonly 박제케이스[],
): Promise<number> {
  const c = await (await db()).connect();
  try {
    await c.query('BEGIN');
    // 대상 주소는 표에서 찾는다 — 요청이 주소를 싣게 두면 아무 데나 쏠 수 있다 (execution/store.ts createRun 과 같다)
    const 줄 = await c.query<{ name: string; tests_repo: string; base_url: string }>(
      `SELECT s.name, s.tests_repo, e.base_url FROM service s JOIN service_env e ON e.service_id = s.id AND e.env = $2 WHERE s.id = $1`,
      [set.serviceId, env],
    );
    const 머리 = 줄.rows[0];
    if (머리 === undefined) throw new 호환성실행오류('ENV_NOT_FOUND', `${env} 대상 서버가 없습니다`);
    const r = await c.query<{ run_id: string }>(
      `INSERT INTO test_run (title, service_id, service_name, tests_repo, triggered_by, triggered_by_name, env, base_url, status, origin, kind, compat_set_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'RUNNING', 'MANUAL', 'COMPAT', $9) RETURNING run_id`,
      [set.name, set.serviceId, 머리.name, 머리.tests_repo, 사람.username, 사람.displayName, env, 머리.base_url, set.id],
    );
    const runId = Number(r.rows[0]?.run_id);
    // 원격 접기가 없어 폴더블도 상태 하나다 — 점검 상태 = 디바이스 (§3.13 「디바이스 · 점검 상태」)
    for (const [i, d] of set.devices.entries()) {
      await c.query('INSERT INTO compat_run_device (run_id, seq, serial, model, name) VALUES ($1, $2, $3, $4, $5)', [runId, i + 1, d.serial, d.model, d.name]);
      for (const k of 케이스들) {
        await c.query(
          'INSERT INTO compat_run_case (run_id, seq, tc_id, tc_name, picked, file_path, timeout_ms) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [runId, i + 1, k.tcId, k.name, k.picked, k.filePath, k.timeoutMs],
        );
      }
    }
    await c.query('COMMIT');
    return runId;
  } catch (err) {
    await c.query('ROLLBACK');
    throw err;
  } finally {
    c.release();
  }
}


/** 잡자마자 쓴다 — 중단 · 다시 켜기가 이 칸을 보고 놓는다. 이미 중단으로 닫힌 상태면 false */
export async function 상태잡음(runId: number, seq: number, held: string, fold: 상태줄['fold']): Promise<boolean> {
  // device 는 실제로 잡은 serial 로 시작하고 첫 케이스의 러너 응답(기기 칸)을 덧붙인다 (데이터모델 「호환성 표」 compat_run_device.device)
  const r = await (await db()).query(
    `UPDATE compat_run_device SET state = 'RUNNING', held_serial = $3, device = jsonb_build_object('serial', $3::text), fold = $4, started_at = now()
      WHERE run_id = $1 AND seq = $2 AND state = 'WAIT'`,
    [runId, seq, held, fold],
  );
  return r.rowCount === 1;
}

/** 그 상태의 첫 케이스 러너 응답 기기 칸(run_item.device 와 같은 모양)을 붙인다. 이미 붙였으면 그대로 */
export async function 기기채우기(runId: number, seq: number, 기기: object): Promise<void> {
  await (await db()).query(
    `UPDATE compat_run_device SET device = COALESCE(device, '{}'::jsonb) || $3::jsonb WHERE run_id = $1 AND seq = $2 AND NOT COALESCE(device ? 'model', false)`,
    [runId, seq, JSON.stringify(기기)],
  );
}

/** 시작했지만 결과가 안 온 케이스를 미실행으로 닫는다 — 엔진이 깨졌거나 admin 이 다시 켜져 결과를 받을 쪽이 없다 */
export async function 안끝난케이스닫기(runId: number | null, 까닭: string): Promise<void> {
  await (await db()).query(
    `UPDATE compat_run_case SET status = 'NA', check_state = NULL, error = jsonb_build_object('message', $2::text), finished_at = now()
      WHERE ($1::bigint IS NULL OR run_id = $1) AND started_at IS NOT NULL AND finished_at IS NULL`,
    [runId, 까닭],
  );
}

/** 놓은 뒤 — 도는 상태는 점검 중으로. 중단이 먼저 STOPPED 로 닫았으면 그대로 둔다 */
export async function 상태놓음(runId: number, seq: number): Promise<void> {
  await (await db()).query(
    `UPDATE compat_run_device SET held_serial = NULL, state = CASE WHEN state = 'RUNNING' THEN 'CHECKING' ELSE state END WHERE run_id = $1 AND seq = $2`,
    [runId, seq],
  );
}

/** 끝난 값(SKIPPED · DONE)으로 닫는다. 이미 끝난 값이면 안 바꾼다 */
export async function 상태닫기(runId: number, seq: number, state: 'SKIPPED' | 'DONE', skipReason: string | null = null): Promise<void> {
  await (await db()).query(
    `UPDATE compat_run_device SET state = $3, skip_reason = COALESCE($4, skip_reason), finished_at = now()
      WHERE run_id = $1 AND seq = $2 AND state IN ('WAIT', 'RUNNING', 'CHECKING')`,
    [runId, seq, state, skipReason],
  );
}

export async function 케이스시작(id: number): Promise<void> {
  await (await db()).query('UPDATE compat_run_case SET started_at = now() WHERE id = $1', [id]);
}

/** 돈 결과를 남긴다. 점검을 기다릴 케이스면 check_state 는 checking 이다 */
export async function 케이스끝(
  id: number,
  결과: { status: 케이스줄['status']; failedStep: number | null; steps: object[]; error: object | null; checkState: 'checking' | null },
): Promise<void> {
  await (await db()).query(
    'UPDATE compat_run_case SET status = $2, failed_step = $3, steps = $4, error = $5, check_state = $6, finished_at = now() WHERE id = $1 AND finished_at IS NULL',
    [id, 결과.status, 결과.failedStep, JSON.stringify(결과.steps), 결과.error === null ? null : JSON.stringify(결과.error), 결과.checkState],
  );
}

/**
 * 점검 결과를 한 번만 쓴다 — 점검 중인 케이스만 받는다. 다시 켜기 정리가 먼저 missing 으로 닫았으면 버린다.
 * 그 상태의 케이스 점검이 다 끝났으면 상태도 DONE 으로 닫는다
 */
export async function 점검저장(id: number, 상태: Exclude<점검상태, 'checking'> | 'missing', 줄들: readonly 화면줄[]): Promise<boolean> {
  const c = await (await db()).connect();
  try {
    await c.query('BEGIN');
    const r = await c.query<{ run_id: string; seq: number }>(
      `UPDATE compat_run_case SET check_state = $2 WHERE id = $1 AND check_state = 'checking' RETURNING run_id, seq`,
      [id, 상태],
    );
    const 줄 = r.rows[0];
    if (줄 === undefined) {
      await c.query('ROLLBACK');
      return false;
    }
    for (const s of 줄들) {
      await c.query(
        `INSERT INTO compat_screen (case_run_id, run_id, seq, screen_key, step, at, before, status, issues, file) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [id, 줄.run_id, 줄.seq, s.key, s.step, s.at, s.before, s.status, JSON.stringify(s.issues), s.file],
      );
    }
    await c.query(
      `UPDATE compat_run_device d SET state = 'DONE', finished_at = now()
        WHERE d.run_id = $1 AND d.seq = $2 AND d.state = 'CHECKING'
          AND NOT EXISTS (SELECT 1 FROM compat_run_case k WHERE k.run_id = d.run_id AND k.seq = d.seq AND k.check_state = 'checking')`,
      [줄.run_id, 줄.seq],
    );
    await c.query('COMMIT');
    return true;
  } catch (err) {
    await c.query('ROLLBACK');
    throw err;
  } finally {
    c.release();
  }
}

/** 점검 중인 케이스가 없는 점검 중 상태를 닫는다 — 점검을 기다릴 케이스가 하나도 없던 상태 */
export async function 빈점검닫기(runId: number): Promise<void> {
  await (await db()).query(
    `UPDATE compat_run_device d SET state = 'DONE', finished_at = now()
      WHERE d.run_id = $1 AND d.state = 'CHECKING'
        AND NOT EXISTS (SELECT 1 FROM compat_run_case k WHERE k.run_id = d.run_id AND k.seq = d.seq AND k.check_state = 'checking')`,
    [runId],
  );
}

/** 다 돌고 점검이 다 끝나면 끝낸다 — 끝내기는 호환성 몫이다(finishRun 은 run_item 이 없어 곧바로 끝낸다). 중단된 실행은 안 건드린다 */
export async function 실행끝내기(runId: number): Promise<void> {
  await (await db()).query(
    `UPDATE test_run SET status = 'FINISHED', finished_at = now()
      WHERE run_id = $1 AND status = 'RUNNING'
        AND NOT EXISTS (SELECT 1 FROM compat_run_device WHERE run_id = $1 AND state IN ('WAIT', 'RUNNING', 'CHECKING'))
        AND NOT EXISTS (SELECT 1 FROM compat_run_case WHERE run_id = $1 AND check_state = 'checking')`,
    [runId],
  );
}

/**
 * 중단 — 남은 상태(WAIT · RUNNING)는 STOPPED, 실행은 바로 ABORTED. 점검 중인 상태는 점검을 마저 받는다.
 * 잡혀 있는 serial 목록을 돌려준다. 도는 실행이 아니면 null
 */
export async function 실행멈추기(runId: number, 까닭: string): Promise<{ held: string[] } | null> {
  const c = await (await db()).connect();
  try {
    await c.query('BEGIN');
    const r = await c.query<{ status: string }>(`SELECT status FROM test_run WHERE run_id = $1 AND kind = 'COMPAT' FOR UPDATE`, [runId]);
    if (r.rows[0]?.status !== 'RUNNING') {
      await c.query('ROLLBACK');
      return null;
    }
    const 잡음 = await c.query<{ held_serial: string }>('SELECT held_serial FROM compat_run_device WHERE run_id = $1 AND held_serial IS NOT NULL', [runId]);
    await c.query(
      `UPDATE compat_run_device SET state = 'STOPPED', skip_reason = $2, finished_at = now() WHERE run_id = $1 AND state IN ('WAIT', 'RUNNING')`,
      [runId, 까닭],
    );
    await c.query(`UPDATE test_run SET status = 'ABORTED', finished_at = now() WHERE run_id = $1`, [runId]);
    await c.query('COMMIT');
    return { held: 잡음.rows.map((x) => x.held_serial) };
  } catch (err) {
    await c.query('ROLLBACK');
    throw err;
  } finally {
    c.release();
  }
}

/**
 * admin 이 다시 켜질 때 — 차례 돌기 · 점검 기다리기가 메모리에 살아 이어 가지 못한다.
 * 도는 호환성 실행은 멈추고, 어느 실행이든 점검 중인 케이스는 missing 이다. 놓을 [runId, serial] 을 돌려준다
 */
export async function 호환성정리(): Promise<{ runId: number; serial: string }[]> {
  const pool = await db();
  const 도는 = await pool.query<{ run_id: string }>(`SELECT run_id FROM test_run WHERE kind = 'COMPAT' AND status = 'RUNNING'`);
  const 놓을: { runId: number; serial: string }[] = [];
  for (const { run_id } of 도는.rows) {
    const 멈춤 = await 실행멈추기(Number(run_id), '서버가 다시 켜져 실행이 멈췄습니다');
    for (const serial of 멈춤?.held ?? []) 놓을.push({ runId: Number(run_id), serial });
  }
  const 까닭 = '서버가 다시 켜져 실행이 멈췄습니다';
  await 안끝난케이스닫기(null, 까닭);
  await pool.query(`UPDATE compat_run_case SET check_state = 'missing' WHERE check_state = 'checking'`);
  // 점검을 마저 받던 상태도 끝나지 않은 상태라 STOPPED 다 — 받은 점검 화면은 남는다 (§3.13 「실행」 6)
  await pool.query(
    `UPDATE compat_run_device SET held_serial = NULL,
            state = CASE WHEN state = 'CHECKING' THEN 'STOPPED' ELSE state END,
            skip_reason = CASE WHEN state = 'CHECKING' THEN $1 ELSE skip_reason END,
            finished_at = COALESCE(finished_at, now())
      WHERE held_serial IS NOT NULL OR state = 'CHECKING'`,
    [까닭],
  );
  return 놓을;
}

