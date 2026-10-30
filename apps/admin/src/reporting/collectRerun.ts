// 한 건 실행이 붙은 실행의 증적 — 지금 결과로 읽을 열 목록과 원래 항목 읽기 (도메인/리포팅 §8.4 「다시 실행이 붙은 실행」)

import type { Pool } from 'pg';
import type { 다시실행원재료 } from '../execution/single.js';
import type { RawItem } from './collect.js';

/** run_item 에서 증적이 읽는 열. 지금 결과(파생 표 `i`)와 원래 항목(run_item 그대로)이 같은 목록을 쓴다 */
const 열들 = [
  'history_id', 'tc_id', 'tc_name', 'platform', 'attempt', 'status', 'duration_ms', 'finished_at', 'error',
  'unconfirmed', 'precondition', 'params', 'expected', 'param_schema', 'expected_schema', 'device',
];
export const 지금열 = 열들.map((c) => `i.${c}`).join(', ');

/** 덮인 항목 → 원래 항목. 원래 항목은 지우지 않으므로 그대로 읽힌다 */
export async function 원래항목읽기(pool: Pool, rows: 다시실행원재료[]): Promise<Map<string, RawItem>> {
  const 번호들 = rows.flatMap((r) => (r.orig_history_id === null ? [] : [r.orig_history_id]));
  if (번호들.length === 0) return new Map();
  const r = await pool.query<RawItem>(`SELECT ${열들.join(', ')} FROM run_item WHERE history_id = ANY($1::bigint[])`, [번호들]);
  return new Map(r.rows.map((row) => [row.history_id, row]));
}
