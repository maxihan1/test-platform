// 시나리오 실행의 판정 — 부품 판정을 하나로 접는다 (SPEC 도메인/시나리오 §3.7 결정 9 · §7 「판정 접기」)
// 목록의 lastRun.verdict 와 실행 기록 E2E 탭의 집계가 같은 규칙을 봐야 해서 한 자리에 둔다

/**
 * `scenario_run_part` 행을 run_id 로 묶은 자리에서 쓰는 집계 식. `p` 는 부품 표 별칭이다.
 * 도는 중인 실행(test_run.status = 'RUNNING')은 부르는 쪽이 null 로 가린다 — 부품이 아직 전부 NA 라 여기서는 모른다
 */
export function 접은판정SQL(p: string): string {
  return `CASE WHEN bool_and(${p}.status = 'PASS') THEN 'PASS'
               WHEN bool_or(${p}.status = 'FAIL') THEN 'FAIL'
               ELSE 'NA' END`;
}
