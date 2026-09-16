// 실행 전 입력값 검증 (SPEC §8.2). POST /api/runs는 스키마를 보지 않으므로 화면이 칸 아래에 사유를 낸다
// 검증기를 새로 쓰지 않고 서버가 ParamSet을 저장할 때 쓰는 함수를 그대로 부른다.
// 두 벌을 두면 '실행하기'와 '입력값 세트로 저장'이 같은 값에 다른 사유를 내기 시작한다

import { validate, type Violation } from '../execution/validate.js';

import type { JsonSchema } from './api.js';

export type { Violation };

/** 칸 이름 → 사유 한 줄. 한 칸에 사유가 여럿이면 처음 것만 보여준다 */
export function messagesByKey(violations: Violation[]): Record<string, string> {
  const messages: Record<string, string> = {};
  for (const violation of violations) {
    if (messages[violation.path] === undefined) messages[violation.path] = violation.message;
  }
  return messages;
}

export function fieldErrors(schema: JsonSchema, values: Record<string, unknown>): Record<string, string> {
  return messagesByKey(validate(schema, values));
}
