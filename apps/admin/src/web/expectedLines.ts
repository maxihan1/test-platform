// 「기대 결과」에 적을 확인 문장 — 케이스 코드의 verify 문장이 그 케이스의 성공 조건이다 (도메인/리포팅 §8.4 「기대 결과」)
// 서버 증적(reporting/expectedLines.ts)과 같은 규칙이다 — 화면과 증적 문서가 같은 짜임이어야 한다

import type { StepResult } from './api.js';

/**
 * 실행을 만들 때 박제한 문장이 있으면 그것이다(빈 목록이어도 그대로 — 읽었는데 문장이 없는 케이스다).
 * 없으면(이 칸 전의 항목) 돈 절차에서 판정이 난 문장을 차례대로 쓴다. 참고 줄(판정 없음)은 기대가 아니라 뺀다
 */
export function 기대문장(박제: string[] | null | undefined, steps: Pick<StepResult, 'assertions'>[]): string[] {
  if (박제 != null) return 박제;
  return [...new Set(steps.flatMap((s) => s.assertions.filter((a) => a.status !== 'NA').map((a) => a.statement)))];
}
