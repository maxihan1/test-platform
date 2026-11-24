// 실행 항목 한 줄 — 칸 목록과 응답 모양으로 옮기기. queries.ts 가 300줄을 넘어 떼어 냈다 (SPEC 도메인/실행 §7)

import type { ItemStatus, Platform } from '@platform/kit';

import { 가린값들 } from '../web/mask.js';

import type { RunItemSummary } from './runTypes.js';
import { 가린다, 항목비밀 } from './trial.js';

export interface RawItem {
  history_id: string;
  tc_id: string;
  tc_name: string;
  platform: Platform;
  attempt: number;
  params: Record<string, unknown>;
  param_schema: Record<string, unknown>;
  status: ItemStatus;
  duration_ms: number | null;
  error: { message: string; stack?: string } | null;
  started_at: Date;
  finished_at: Date | null;
  unconfirmed: string | null;
  expected: Record<string, unknown>;
  expected_schema: Record<string, unknown>;
  exec_id: string | null;
  exec_seq: number | null;
  blocked_by: string | null;
  proc_id: string | null;
  proc_name: string | null;
}

// 케이스 줄(i)과 그 줄이 든 실행 단위(e)를 같이 읽는다 — 프로시저 번호 · 이름은 실행 단위의 스냅샷이다.
// 둘에 이름이 같은 칸(platform · attempt · error · 시각)이 있어 케이스 줄 칸에 i. 를 붙인다
const 줄칸 = 'history_id, tc_id, tc_name, platform, attempt, params, param_schema, status, duration_ms, error, started_at, finished_at, unconfirmed, expected, expected_schema, exec_id, exec_seq, blocked_by';
export const ITEM_COLUMNS = `${줄칸.split(', ').map((칸) => `i.${칸}`).join(', ')}, e.proc_id, e.proc_name`;
export const 단위붙이기 = 'LEFT JOIN run_exec e ON e.exec_id = i.exec_id';

const iso = (v: Date | null): string | null => (v === null ? null : v.toISOString());

// 키로 가린 칸 밖에도 같은 값이 되비친다 — 확인의 기대 · 실제 값, 절차 오류 · httpTrace, 항목 오류 (공통/2 §4.1).
// 시나리오 실행 결과(scenario/runRoutes.ts)와 같은 규칙으로 글자째 가린다. 오류가 없는 줄은 목록을 만들지 않는다
export function toItem(row: RawItem, 비밀?: string[]): RunItemSummary {
  return {
    historyId: Number(row.history_id),
    tcId: row.tc_id,
    tcName: row.tc_name,
    platform: row.platform,
    attempt: row.attempt,
    params: 가린값들(row.params, row.param_schema),
    paramSchema: row.param_schema,
    status: row.status,
    durationMs: row.duration_ms,
    error: row.error === null ? null : (가린다(row.error, 비밀 ?? 항목비밀(row)) as RawItem['error']),
    startedAt: row.started_at.toISOString(),
    finishedAt: iso(row.finished_at),
    unconfirmed: row.unconfirmed,
    execId: row.exec_id === null ? null : Number(row.exec_id),
    execSeq: row.exec_seq,
    procId: row.proc_id,
    procName: row.proc_name,
    blockedBy: row.blocked_by,
  };
}
