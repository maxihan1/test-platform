// 호환성 실행 읽기와 판정 — 실행 머리 · 점검 상태 · 케이스 한 번 · 점검 화면 · 판정 · 세트 최근 실행 (도메인/호환성 §7 「결과」 · 데이터모델 「호환성 표」)
// runStore.ts 가 300줄을 넘어 읽기 쪽을 뗐다

import { db } from '../settings/store.js';
import type { 저장화면, 상태값, 상태줄, 케이스줄, 판정줄 } from './result.js';
import type { 의심 } from './uiCheck.js';

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
    `SELECT seq, serial, COALESCE(held_serial, device->>'serial') AS held_serial, model, name, device->>'osVersion' AS os, fold, state, skip_reason FROM compat_run_device WHERE run_id = $1 ORDER BY seq`,
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
    check_state: 케이스줄['checkState']; started_at: Date | null; finished_at: Date | null; message: string | null;
  }>(
    `SELECT id, seq, tc_id, tc_name, file_path, timeout_ms, status, failed_step, check_state, started_at, finished_at, error->>'message' AS message
       FROM compat_run_case WHERE run_id = $1 ORDER BY seq, id`,
    [runId],
  );
  return r.rows.map((x) => ({
    id: Number(x.id), seq: x.seq, tcId: x.tc_id, name: x.tc_name, filePath: x.file_path, timeoutMs: x.timeout_ms, status: x.status, failedStep: x.failed_step,
    checkState: x.check_state, started: x.started_at !== null, finished: x.finished_at !== null, 까닭: x.message,
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
