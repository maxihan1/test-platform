// 작성 요청 사슬(뿌리 → 실행들)을 짓는 SQL 조각 — 아무것도 안 가져온다. store.ts 가 agentStore 를 다시 내보내
// history → store 고리가 생기므로, 집기(agentStore)가 쓰는 조각은 history.ts 밖 이 파일에 둔다 (2026-10-13 PRD-F9-20)

/**
 * 뿌리들 → 그 뿌리의 모든 실행 행(`사슬(id, root_id)`). `WITH RECURSIVE` 안에 넣는다.
 * 새 데이터는 RERUN 의 원본이 늘 뿌리지만 2026-09-23 전 행에는 RERUN→RERUN 이 있고 머지는 실행 행을 가리킨다 —
 * 한 단계가 아니라 끝까지 따라 내려간다 (2026-09-29 계획 검토). 행마다 원본은 하나라 두 번 닿지 않는다
 */
export function 사슬식(뿌리조건: string): string {
  return `사슬(id, root_id) AS (
      SELECT id, id FROM authoring_request WHERE ${뿌리조건}
      UNION ALL
      SELECT a.id, 사슬.root_id FROM authoring_request a JOIN 사슬 ON a.source_id = 사슬.id WHERE a.kind <> 'AUTHOR'
    )`;
}

/** 실패한 머지는 「최신」에서 뺀다 — 빼지 않으면 CI 가 빨갛게 끝난 머지 뒤에 다시 반영할 길이 없다 (2026-09-29 검사) */
export const 최신식 = (사슬이름: string) =>
  `(SELECT max(s.id) FROM ${사슬이름} s JOIN authoring_request x ON x.id = s.id WHERE NOT (x.kind = 'MERGE' AND x.status = 'FAILED'))`;

/**
 * 서비스의 열린 반영 뿌리(`열린반영(root_id, latest)`) — 폐기 안 됨 · 최신 실행이 병합된 반영이 아님 (도메인/작성 §7 apply).
 * 반영 통로(APPLY_OPEN · 화면이 맞음 더하기)와 집기(앞 반영 기다리기)가 같은 뜻을 쓴다. `WITH RECURSIVE` 안에 넣고 `사슬` 도 같이 생긴다
 */
export const 열린반영식 = (서비스자리: string) => `${사슬식(`service_id = ${서비스자리} AND kind = 'AUTHOR' AND params->>'prdApply' = 'true' AND discarded_at IS NULL`)},
    열린반영(root_id, latest) AS (
      SELECT 뿌리.root_id, 뿌리.latest
        FROM (SELECT DISTINCT 사슬.root_id, ${최신식('(SELECT 안.id FROM 사슬 안 WHERE 안.root_id = 사슬.root_id)')} AS latest FROM 사슬) 뿌리
        JOIN authoring_request m ON m.id = 뿌리.latest
       WHERE NOT (m.kind = 'MERGE' AND m.status = 'DONE')
    )`;
