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

/** 뿌리마다 최신 실행(`뿌리(root_id, latest)`). `WITH RECURSIVE` 안에 넣고 `사슬` 도 같이 생긴다 — 열린 반영 · 열린 작성(openRoots.ts)이 같은 「최신」을 쓴다 */
export const 뿌리최신식 = (뿌리조건: string) => `${사슬식(뿌리조건)},
    뿌리(root_id, latest) AS (
      SELECT DISTINCT 사슬.root_id, ${최신식('(SELECT 안.id FROM 사슬 안 WHERE 안.root_id = 사슬.root_id)')} FROM 사슬
    )`;

/**
 * 서비스의 열린 반영 뿌리(`열린반영(root_id, latest)`) — 폐기 안 됨 · 최신 실행이 병합된 반영이 아님 (도메인/작성 §7 apply).
 * 집기(앞 반영 기다리기)가 쓴다. `WITH RECURSIVE` 안에 넣고 `사슬` · `뿌리` 도 같이 생긴다
 */
export const 열린반영식 = (서비스자리: string) => `${뿌리최신식(`service_id = ${서비스자리} AND kind = 'AUTHOR' AND params->>'prdApply' = 'true' AND discarded_at IS NULL`)},
    열린반영(root_id, latest) AS (
      SELECT 뿌리.root_id, 뿌리.latest FROM 뿌리 JOIN authoring_request m ON m.id = 뿌리.latest
       WHERE NOT (m.kind = 'MERGE' AND m.status = 'DONE')
    )`;

/**
 * 번호식(뿌리 번호)의 뿌리가 열린 작성인가 — 폐기 안 됨 · 최신 실행이 대기 · 도는 중 · 끝났고 반영 전 · 반영 중 · 반영 실패. 뜻은 openRoots.ts `열린작성` 과 같다.
 * 결정 진행이 세운 요청의 `params.decision.after` 를 집기가 기다릴 때 쓴다 — 다른 CTE 안에 넣을 수 있게 이름(`앞사슬`)이 겹치지 않는 하위 질의다 (작성 §7 「결정 목록 통로」)
 */
export const 열린뿌리식 = (번호식: string) => `EXISTS (
    WITH RECURSIVE 앞사슬(id) AS (
      SELECT id FROM authoring_request WHERE id = ${번호식} AND kind IN ('AUTHOR', 'EDIT') AND discarded_at IS NULL
      UNION ALL
      SELECT a.id FROM authoring_request a JOIN 앞사슬 ON a.source_id = 앞사슬.id WHERE a.kind <> 'AUTHOR'
    )
    SELECT 1 FROM authoring_request m
     WHERE m.id = ${최신식('앞사슬')}
       AND (m.status IN ('PENDING', 'RUNNING') OR (m.status = 'DONE' AND m.kind <> 'MERGE'))
  )`;
