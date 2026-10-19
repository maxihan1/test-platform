// 실패 · 미실행 항목 하나가 왜 통과하지 못했는지 — 유형과 사람 말 한 줄 (도메인/실행 §7 항목 상세 failure)
// 항목 상세 · 실패 카드 · 시나리오 결과가 같이 쓴다. 유형은 대시보드와 같은 함수, 한 줄은 insights 대표 문장과 같은 고르기다

import type { ItemStatus, StepResult } from '@platform/kit';

import { 원인을가른다, 색코드, type 실패유형 } from './failureType.js';
import { 한줄로자른다 } from './insights.js';

export interface 항목실패 {
  type: 실패유형;
  reason: string;
}

// 고를 재료가 없을 때만 쓴다 — 모르는 사유를 지어내지 않고 유형이 말하는 만큼만 적는다
export const 유형문장: Record<실패유형, string> = {
  mismatch: '기대 결과와 다릅니다',
  notFound: '요소를 끝내 찾지 못했습니다',
  timeout: '제한 시간 안에 끝나지 않았습니다',
  environment: '대상 서버나 러너에 닿지 못했습니다',
  other: '원인을 가르지 못했습니다',
};

const 러너글자 = /^[A-Z][A-Z_]*$/;

export interface 항목재료 {
  status: ItemStatus;
  /** 아직 안 끝난 항목은 이유가 없다 — 도는 중인 실행의 NA 를 실패로 읽지 않는다 */
  finished: boolean;
  error: { message: string } | null | undefined;
  steps: Pick<StepResult, 'assertions' | 'error'>[];
}

/**
 * 한 줄의 재료는 실패한 첫 확인 문장, 없으면 항목 오류다 — 절차 오류로 넘어가지 않는다(리포팅 §8.4, 넘어가는 것은 증적만).
 * 기대 · 실제 값은 붙이지 않는다. 가리기는 자르기 전에 한다 — 잘린 자리에 비밀 조각이 남는다
 */
export function 항목실패를가른다(항목: 항목재료, 가리기: (글: string) => string): 항목실패 | null {
  if (항목.status === 'PASS' || !항목.finished) return null;
  const 실패확인 = 항목.steps.flatMap((s) => s.assertions).find((a) => a.status === 'FAIL');
  const 원인 = 원인을가른다({
    status: 항목.status,
    assertFailed: 실패확인 !== undefined,
    itemMessage: 항목.error?.message ?? '',
    stepMessage: 항목.steps.find((s) => s.error !== undefined)?.error?.message ?? '',
  });
  // 앞 부품이 실패해 안 돈 시나리오 부품(NOT_RUN)은 실패 원인이 아니다 (도메인/시나리오 §3.7 결정 9 — 케이스 항목에는 이 글이 없다)
  if (원인 === 'stopped' || 항목.error?.message === 'NOT_RUN') return null;
  // 색 코드는 가리기 전에 걷는다 — 숫자 비밀(예: 31)이 색 코드 속 숫자를 덮으면 걷는 무늬가 안 맞는다
  const 한줄 = 한줄로자른다(가리기((실패확인?.statement ?? 항목.error?.message ?? '').replace(색코드, '')));
  // 러너가 끊은 자리의 상태 글자(TIMEOUT 따위)는 사람 말이 아니다 — 유형이 말하는 문장으로 바꾼다
  return { type: 원인, reason: 한줄 === '' || 러너글자.test(한줄) ? 유형문장[원인] : 한줄 };
}
