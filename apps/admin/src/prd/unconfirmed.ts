// 케이스가 지금 미확정인가 — 지도 ① 과 표준 기획서 지금 판에서 계산하는 SQL 식 (도메인/작성 §3.6 「★ 표준 기획서」 「미확정」)

/** 표준 기획서가 정한 미확정 사유의 머리. 사유 꼴은 카탈로그 §7 계약 블록 「확인 필요 — <요구 번호들>」 */
export const 확인필요머리 = '확인 필요 — ';

/**
 * 케이스 행 별칭 `c` 의 미확정 사유를 내는 SQL 식. 미확정이 아니면 NULL 이다.
 *
 * 덮는 요구 가운데 지금 판에서 확인 필요인 번호가 있으면 그 번호들이 사유다.
 * 그 밖에는 꼬리표를 따르되, 덮는 요구 가운데 「PRD 관리」에서 사람이 확정한(byPerson) 것이 있으면 확정이다 — 메뉴 확정이 즉시 먹게.
 * 꼬리표를 그냥 무시하지 않는 까닭 — 옛 표 케이스 · 이어 작성의 화면 규칙 줄(가까운 확정 요구에 붙는다)은 화면 값으로 만들었는데
 * 덮는 요구가 문서로 확정이라 꼬리표 없이 확정으로 돈다(2026-10-11 spec-review · 사용자 A안).
 * 꼬리표를 없애는 태스크가 꼬리표 갈래를 뺀다 (진행판 PRD-F4-05).
 *
 * 실행 박제 · 시나리오 부품 박제 · 케이스 목록이 이 식 하나를 쓴다. 자리마다 따로 짜면 목록은 미확정인데 실행은 확정으로 박제된다
 */
export function 미확정사유SQL(c: string): string {
  // jsonb 포함(@>)으로 판의 항목 배열에서 번호 · 상태를 찾는다 — 배열을 펼치지 않는다.
  // ponytail: 케이스 행마다 req_case 를 tc_id 로 훑는다(색인 없음). 케이스 수천 · 지도 수만 줄이 되면 req_case(tc_id) 색인을 마이그레이션으로 더한다
  const 확인필요 = `pv.items @> jsonb_build_array(jsonb_build_object('reqId', rc.req_id, 'status', 'NEEDS_CHECK'))`;
  const 사람확정 = `pv.items @> jsonb_build_array(jsonb_build_object('reqId', rc.req_id, 'status', 'CONFIRMED', 'byPerson', true))`;
  return `(SELECT CASE
      WHEN COALESCE(bool_or(${확인필요}), false)
        THEN '${확인필요머리}' || string_agg(DISTINCT rc.req_id, ' · ' ORDER BY rc.req_id) FILTER (WHERE ${확인필요})
      WHEN COALESCE(bool_or(${사람확정}), false) THEN NULL
      ELSE ${c}.unconfirmed
    END
    FROM req_case rc
    LEFT JOIN prd_version pv
      ON pv.service_id = rc.service_id
     AND pv.version = (SELECT max(v.version) FROM prd_version v WHERE v.service_id = rc.service_id)
    WHERE rc.tc_id = ${c}.tc_id)`;
}
