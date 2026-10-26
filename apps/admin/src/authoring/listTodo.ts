// 작성 목록 줄의 todo(사람이 할 일) 를 뿌리 여러 개에 한 번에 계산한다 (도메인/작성 §7 목록 · 2026-10-19 ⑫). 줄 내용은 listSummary.ts

import { 반영할일, type 반영 } from './applyTodo.js';
import { 겹침들, 남은겹침수, type 겹침입력 } from './conflicts.js';
import { 보류들, 남은수, type 보류입력 } from './held.js';
import { 사슬식 } from './chainSql.js';
import { db } from './store.js';

export { 반영할일 };

export interface 할일 {
  heldOpen: number;
  conflictsOpen: number;
  apply: 반영;
}

export const 할일없음: 할일 = { heldOpen: 0, conflictsOpen: 0, apply: null };

export function 할일남았나(t: 할일): boolean {
  return t.heldOpen > 0 || t.conflictsOpen > 0 || t.apply !== null;
}

/**
 * 뿌리마다 남은 보류 · 겹침 수 — **머지를 뺀 최신 작성 실행** 기준이다. 보류는 작성 행에 있고 겹침도 원본 작성 행 기준이라
 * 겹침으로 실패한 반영을 기준으로 세면 둘 다 0 이 된다. 셈 규칙은 상세(`보류상세` · `겹침상세`)와 같은 함수다
 */
export async function 남은손들(뿌리들: number[]): Promise<Map<number, { heldOpen: number; conflictsOpen: number }>> {
  if (뿌리들.length === 0) return new Map();
  const r = await (await db()).query<{
    root_id: string;
    result: unknown;
    held_input: 보류입력 | null;
    conflict_input: 겹침입력 | null;
    merge_status: string | null;
    merge_result: unknown;
  }>(
    `WITH RECURSIVE ${사슬식('id = ANY($1::bigint[])')},
     작성 AS (
       SELECT DISTINCT ON (사슬.root_id) 사슬.root_id, a.id, a.result, a.held_input, a.conflict_input
         FROM 사슬 JOIN authoring_request a ON a.id = 사슬.id
        WHERE a.kind <> 'MERGE'
        ORDER BY 사슬.root_id, a.id DESC
     )
     SELECT 작성.root_id, 작성.result, 작성.held_input, 작성.conflict_input, m.status AS merge_status, m.result AS merge_result
       FROM 작성
       LEFT JOIN LATERAL (
         SELECT status, result FROM authoring_request WHERE kind = 'MERGE' AND source_id = 작성.id ORDER BY id DESC LIMIT 1
       ) m ON true`,
    [뿌리들],
  );
  return new Map(
    r.rows.map((x) => [
      Number(x.root_id),
      {
        heldOpen: 남은수(보류들(x.result), x.held_input),
        conflictsOpen: x.merge_status === 'FAILED' ? 남은겹침수(겹침들(x.merge_result), x.conflict_input) : 0,
      },
    ]),
  );
}
