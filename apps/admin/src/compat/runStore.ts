// 호환성 실행의 DB 쪽 — 실행 세우기 · 점검 상태 · 케이스 한 번 · 점검 화면 · 판정 · 중단 · 다시 켜기 정리 (도메인/호환성 §3.13 「실행」 · 데이터모델 「호환성 표」)

import { db } from '../settings/store.js';
import type { 저장화면, 상태값, 상태줄, 케이스줄, 판정줄 } from './result.js';
import type { 의심, 점검상태, 화면줄 } from './uiCheck.js';

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

export interface 실행머리 {
  runId: number;
  setId: number;
  serviceId: number;
  prefix: string;
  serviceKind: string;
  title: string;
  env: string;
  buildNo: string | null;
  status: 'RUNNING' | 'FINISHED' | 'ABORTED';
  startedAt: string;
  finishedAt: string | null;
  startedBy: string;
  onePerModel: boolean;
}

export async function 실행머리읽기(runId: number): Promise<실행머리 | null> {
  const r = await (await db()).query<{
    run_id: string; compat_set_id: string; service_id: string; prefix: string; kind: string; title: string; env: string; build_no: string | null;
    status: 실행머리['status']; started_at: Date; finished_at: Date | null; triggered_by: string; triggered_by_name: string | null; one_per_model: boolean;
  }>(
    `SELECT r.run_id, r.compat_set_id, r.service_id, s.prefix, s.kind, r.title, r.env, r.build_no, r.status, r.started_at, r.finished_at,
            r.triggered_by, r.triggered_by_name, c.one_per_model
       FROM test_run r JOIN service s ON s.id = r.service_id JOIN compat_set c ON c.id = r.compat_set_id
      WHERE r.run_id = $1 AND r.kind = 'COMPAT'`,
    [runId],
  );
  const x = r.rows[0];
  if (x === undefined) return null;
  return {
    runId, setId: Number(x.compat_set_id), serviceId: Number(x.service_id), prefix: x.prefix, serviceKind: x.kind, title: x.title, env: x.env, buildNo: x.build_no,
    status: x.status, startedAt: x.started_at.toISOString(), finishedAt: x.finished_at?.toISOString() ?? null, startedBy: x.triggered_by_name ?? x.triggered_by, onePerModel: x.one_per_model,
  };
}

export async function 상태들읽기(runId: number): Promise<상태줄[]> {
  const r = await (await db()).query<{ seq: number; serial: string; held_serial: string | null; model: string; name: string; os: string | null; fold: 상태줄['fold']; state: 상태값; skip_reason: string | null }>(
    // 놓으면 held_serial 이 비지만 잡은 폰의 사본(device)이 남는다 — 결과는 실제로 돈 폰을 보인다 (모델별 1대로 바꿔 잡았으면 고른 것과 다르다)
    `SELECT seq, serial, COALESCE(held_serial, device->>'serial') AS held_serial, model, name, device->>'os' AS os, fold, state, skip_reason FROM compat_run_device WHERE run_id = $1 ORDER BY seq`,
    [runId],
  );
  return r.rows.map((x) => ({ seq: x.seq, serial: x.serial, heldSerial: x.held_serial, model: x.model, name: x.name, os: x.os, fold: x.fold, state: x.state, skipReason: x.skip_reason }));
}

export interface 실행케이스 extends 케이스줄 {
  name: string;
  filePath: string;
  timeoutMs: number;
}

export async function 케이스들읽기(runId: number): Promise<실행케이스[]> {
  const r = await (await db()).query<{
    id: string; seq: number; tc_id: string; tc_name: string; file_path: string; timeout_ms: number; status: 케이스줄['status']; failed_step: number | null;
    check_state: 케이스줄['checkState']; started_at: Date | null; finished_at: Date | null;
  }>('SELECT id, seq, tc_id, tc_name, file_path, timeout_ms, status, failed_step, check_state, started_at, finished_at FROM compat_run_case WHERE run_id = $1 ORDER BY seq, id', [runId]);
  return r.rows.map((x) => ({
    id: Number(x.id), seq: x.seq, tcId: x.tc_id, name: x.tc_name, filePath: x.file_path, timeoutMs: x.timeout_ms, status: x.status, failedStep: x.failed_step,
    checkState: x.check_state, started: x.started_at !== null, finished: x.finished_at !== null,
  }));
}

export async function 화면들읽기(runId: number): Promise<(저장화면 & { file: string | null })[]> {
  const r = await (await db()).query<{ id: string; case_run_id: string; seq: number; screen_key: string; step: number | null; status: 저장화면['status']; issues: 의심[]; file: string | null }>(
    'SELECT id, case_run_id, seq, screen_key, step, status, issues, file FROM compat_screen WHERE run_id = $1 ORDER BY id',
    [runId],
  );
  return r.rows.map((x) => ({ id: Number(x.id), caseRunId: Number(x.case_run_id), seq: x.seq, key: x.screen_key, step: x.step, status: x.status, issues: x.issues, file: x.file }));
}

export async function 판정들읽기(runId: number): Promise<판정줄[]> {
  const r = await (await db()).query<{ screen_key: string; seq: number; verdict: 판정줄['verdict']; judged_by: string; judged_at: Date }>(
    'SELECT screen_key, seq, verdict, judged_by, judged_at FROM compat_verdict WHERE run_id = $1',
    [runId],
  );
  return r.rows.map((x) => ({ key: x.screen_key, seq: x.seq, verdict: x.verdict, judgedBy: x.judged_by, judgedAt: x.judged_at.toISOString() }));
}

/** 잡자마자 쓴다 — 중단 · 다시 켜기가 이 칸을 보고 놓는다. 이미 중단으로 닫힌 상태면 false */
export async function 상태잡음(runId: number, seq: number, held: string, device: object, fold: 상태줄['fold']): Promise<boolean> {
  const r = await (await db()).query(
    `UPDATE compat_run_device SET state = 'RUNNING', held_serial = $3, device = $4, fold = $5, started_at = now() WHERE run_id = $1 AND seq = $2 AND state = 'WAIT'`,
    [runId, seq, held, JSON.stringify(device), fold],
  );
  return r.rowCount === 1;
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
  await pool.query(`UPDATE compat_run_case SET check_state = 'missing' WHERE check_state = 'checking'`);
  await pool.query(
    `UPDATE compat_run_device SET held_serial = NULL, state = CASE WHEN state = 'CHECKING' THEN 'DONE' ELSE state END,
            finished_at = COALESCE(finished_at, now())
      WHERE held_serial IS NOT NULL OR state = 'CHECKING'`,
  );
  return 놓을;
}

/** 판정을 남기거나(값) 되돌린다(null). 그 칸에 의심이 있는 점검 화면이 없으면 false */
export async function 판정하기(runId: number, key: string, seq: number, verdict: 판정줄['verdict'] | null, 누가: string): Promise<boolean> {
  const pool = await db();
  const 의심 = await pool.query(
    `SELECT 1 FROM compat_screen WHERE run_id = $1 AND screen_key = $2 AND seq = $3 AND jsonb_array_length(issues) > 0 LIMIT 1`,
    [runId, key, seq],
  );
  if ((의심.rowCount ?? 0) === 0) return false;
  if (verdict === null) await pool.query('DELETE FROM compat_verdict WHERE run_id = $1 AND screen_key = $2 AND seq = $3', [runId, key, seq]);
  else {
    await pool.query(
      `INSERT INTO compat_verdict (run_id, screen_key, seq, verdict, judged_by) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (run_id, screen_key, seq) DO UPDATE SET verdict = EXCLUDED.verdict, judged_by = EXCLUDED.judged_by, judged_at = now()`,
      [runId, key, seq, verdict, 누가],
    );
  }
  return true;
}

/** 세트마다 가장 최근 호환성 실행 번호 */
export async function 세트최근실행(setIds: readonly number[]): Promise<Map<number, number>> {
  if (setIds.length === 0) return new Map();
  const r = await (await db()).query<{ compat_set_id: string; run_id: string }>(
    `SELECT DISTINCT ON (compat_set_id) compat_set_id, run_id FROM test_run WHERE kind = 'COMPAT' AND compat_set_id = ANY($1::bigint[]) ORDER BY compat_set_id, run_id DESC`,
    [setIds],
  );
  return new Map(r.rows.map((x) => [Number(x.compat_set_id), Number(x.run_id)]));
}
