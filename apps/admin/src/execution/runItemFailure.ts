// 실행 조회의 항목 줄에 싣는 실패 이유 — 항목 상세와 같은 함수 · 같은 가리기로 만든다 (도메인/실행 §7 `GET /api/runs/:runId` items[].failure)

import type { StepResult } from '@platform/kit';
import type { Pool } from 'pg';

import { 항목실패를가른다, type 항목실패 } from '../reporting/itemFailure.js';

import type { RawItem } from './runItemRow.js';
import { 가린다, 항목비밀 } from './trial.js';

interface 이유절차 {
  history_id: string;
  status: StepResult['status'];
  assertions: StepResult['assertions'];
  error: StepResult['error'] | null;
  shape_checks: StepResult['shapeChecks'] | null;
}

/** 끝난 Fail 줄인가 — 이유를 싣는 줄은 이것뿐이다. 통과 · 안 끝남 · 멈춘 줄 · Blocked 는 null */
export const 이유줄인가 = (row: Pick<RawItem, 'status' | 'finished_at'>): boolean => row.status === 'FAIL' && row.finished_at !== null;

/**
 * 끝난 Fail 줄의 이유를 history_id 로 찾게 모아 준다. 줄마다 묻지 않고 절차를 한 질의로 읽는다 — 실행 하나가 5000줄까지다.
 * `줄들` 은 바꿔 끼운 뒤의 줄이라 한 건 실행이 덮은 줄은 덮은 뒤 줄의 이유다. 비밀은 항목 상세와 같이 프로시저 줄이면 실행 단위 것이다
 */
export async function 실패이유들(pool: Pool, 줄들: RawItem[], 단위비밀: Map<number, string[]>): Promise<Map<number, 항목실패 | null>> {
  const 대상 = 줄들.filter(이유줄인가);
  const 이유 = new Map<number, 항목실패 | null>();
  if (대상.length === 0) return 이유;
  const 절차 = await pool.query<이유절차>(
    'SELECT history_id, status, assertions, error, shape_checks FROM run_item_step WHERE history_id = ANY($1::bigint[]) ORDER BY history_id, seq',
    [대상.map((r) => r.history_id)],
  );
  const 줄별 = new Map<string, 이유절차[]>();
  for (const s of 절차.rows) 줄별.set(s.history_id, [...(줄별.get(s.history_id) ?? []), s]);

  for (const row of 대상) {
    const 비밀 = row.proc_id === null ? 항목비밀(row) : (단위비밀.get(Number(row.exec_id)) ?? 항목비밀(row));
    // 항목 상세의 toStep 과 같은 가리기 — 절차 칸이 비면 칸이 없는 것으로 읽는다
    const steps = (줄별.get(row.history_id) ?? []).map((s) => ({
      status: s.status,
      assertions: 가린다(s.assertions, 비밀) as StepResult['assertions'],
      ...(s.error === null ? {} : { error: 가린다(s.error, 비밀) as StepResult['error'] }),
      ...(s.shape_checks === null ? {} : { shapeChecks: 가린다(s.shape_checks, 비밀) as StepResult['shapeChecks'] }),
    }));
    이유.set(
      Number(row.history_id),
      항목실패를가른다({ status: row.status, finished: true, error: row.error, steps }, (글) => 가린다(글, 비밀) as string),
    );
  }
  return 이유;
}
