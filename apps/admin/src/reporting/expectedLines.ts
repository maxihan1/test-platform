// 증적의 「기대 결과」에 적을 확인 문장 — 실행을 만들 때 박제한 값이 있으면 그것, 없으면 돈 절차에서 판정이 난 문장 (TP-F3-35)

import type { EvidenceItem } from './collect.js';

/**
 * 박제 값이 null 이면(이 칸 전의 줄 · 코드에서 못 읽은 케이스) 돈 절차의 판정 문장을 차례대로 쓴다. NA 는 판정이 안 난 문장 · 참고라 뺀다.
 * 박제 값은 빈 배열이어도 그대로다 — 읽었는데 문장이 없는 케이스에 돈 절차 문장을 끌어오면 코드에 없는 기대가 생긴다
 */
export function 기대문장(item: Pick<EvidenceItem, 'verifyStatements' | 'steps'>): string[] {
  if (item.verifyStatements != null) return item.verifyStatements;
  return [...new Set(item.steps.flatMap((s) => s.assertions.filter((a) => a.status !== 'NA').map((a) => a.statement)))];
}
