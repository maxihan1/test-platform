// 실패 · 미실행 항목 하나가 왜 통과하지 못했는지 — 유형과 사람 말 한 줄 (도메인/실행 §7 항목 상세 failure)
// 항목 상세 · 실패 카드 · 시나리오 결과가 같이 쓴다. 유형은 대시보드와 같은 함수, 한 줄은 insights 대표 문장과 같은 고르기다

import { 모양문장, type ItemStatus, type StepResult } from '@platform/kit';

import { 원인을가른다, 색코드, 한줄로자른다, type 실패유형 } from './failureType.js';

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

// 어떤 요소를 못 찾았는지 — 앱(WebdriverIO · Appium)은 selector "…", Playwright 는 「waiting for locator(…)」 줄에 있다
const 요소이름 = /selector "([^"]+)"|waiting for ((?:locator|getBy)[^\n]*)/;

const 러너글자 = /^[A-Z][A-Z_]*$/;
// 사람 말 한 줄이어야 한다 — 한글이 없는 첫 줄은 Playwright · Appium 원문이다. 원문은 「원문 보기」가 따로 보인다 (2026-11-06 WEB-F9-14 · 점검표 B4)
const 한글 = /[가-힣]/;

export interface 항목재료 {
  status: ItemStatus;
  /** 아직 안 끝난 항목은 이유가 없다 — 도는 중인 실행의 NA 를 실패로 읽지 않는다 */
  finished: boolean;
  error: { message: string } | null | undefined;
  steps: Pick<StepResult, 'assertions' | 'error' | 'shapeChecks'>[];
}

/**
 * 한 줄의 재료는 실패한 첫 확인 문장, 없으면 항목 오류, 그것도 없으면 첫 응답 모양 문제다(도메인/API §3.8 — kit 의 차례와 같다) — 절차 오류로 넘어가지 않는다(리포팅 §8.4, 넘어가는 것은 증적만).
 * 기대 · 실제 값은 붙이지 않는다. 가리기는 자르기 전에 한다 — 잘린 자리에 비밀 조각이 남는다
 */
export function 항목실패를가른다(항목: 항목재료, 가리기: (글: string) => string): 항목실패 | null {
  if (항목.status === 'PASS' || !항목.finished) return null;
  const 실패확인 = 항목.steps.flatMap((s) => s.assertions).find((a) => a.status === 'FAIL');
  // 모양만 틀린 실패는 리포터가 항목 오류를 비운다 — 확인 문장이 틀린 것과 같은 「기대와 다름」이다
  const 모양실패 = 항목.steps.flatMap((s) => s.shapeChecks ?? []).find((c) => c.result === 'FAIL');
  const 원인 = 원인을가른다({
    status: 항목.status,
    assertFailed: 실패확인 !== undefined || 모양실패 !== undefined,
    itemMessage: 항목.error?.message ?? '',
    stepMessage: 항목.steps.find((s) => s.error !== undefined)?.error?.message ?? '',
  });
  // 앞 부품이 실패해 안 돈 시나리오 부품(NOT_RUN)은 실패 원인이 아니다 (도메인/시나리오 §3.7 결정 9 — 케이스 항목에는 이 글이 없다)
  if (원인 === 'stopped' || 항목.error?.message === 'NOT_RUN') return null;
  // 색 코드는 가리기 전에 걷는다 — 숫자 비밀(예: 31)이 색 코드 속 숫자를 덮으면 걷는 무늬가 안 맞는다
  const 오류에서 = 실패확인 === undefined && Boolean(항목.error?.message);
  const 재료 = 실패확인?.statement ?? (항목.error?.message || (모양실패 === undefined ? '' : 모양문장(모양실패)));
  const 가린글 = 가리기(재료.replace(색코드, ''));
  const 한줄 = 한줄로자른다(가린글);
  // 러너가 끊은 자리의 상태 글자(TIMEOUT 따위)와 오류의 영어 원문은 사람 말이 아니다 — 유형이 말하는 문장으로 바꾼다.
  // 사람이 쓴 확인 문장은 영어여도 그대로다 — 실패를 서로 가를 수 있게 (WEB-F9-14 끝 검사)
  if (한줄 !== '' && !러너글자.test(한줄) && !(오류에서 && !한글.test(한줄))) return { type: 원인, reason: 한줄 };
  // 영어 원문을 유형 문장으로 바꿀 때도 못 찾은 요소는 남긴다 — 원문을 열어야 보이던 것이다 (WEB-F9-20)
  const 요소 = 원인 === 'notFound' ? 요소이름.exec(가린글) : null;
  const 이름 = 요소 === null ? '' : 한줄로자른다(요소[1] ?? 요소[2] ?? '');
  return { type: 원인, reason: 이름 === '' ? 유형문장[원인] : `${유형문장[원인]} — ${이름}` };
}
