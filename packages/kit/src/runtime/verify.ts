// 테스트 코드의 유일한 검증 수단. expect와 달리 문장·기대값·실제값을 결과에 남긴다 (SPEC §4)

import { isDeepStrictEqual } from 'node:util';

import type { AssertionResult } from '../types.js';
import { callerLine } from './callsite.js';
import { stepScope } from './context.js';

// blocker 문장이 실패했다는 내부 신호. 절차를 끝내되 예외 실패와 구분하려고 별도 타입으로 둔다
export class BlockerStop extends Error {
  constructor(statement: string) {
    super(`실행 중단: '${statement}' 검증이 실패했다`);
    this.name = 'BlockerStop';
  }
}

export interface VerifyOptions {
  // 이 문장이 실패하면 뒤 절차의 전제가 무너지는 경우에만 붙인다 (SPEC §4)
  blocker?: boolean;
}

export async function verify(
  statement: string,
  actual: unknown,
  expected: unknown,
  options?: VerifyOptions,
): Promise<boolean> {
  const scope = stepScope.getStore();
  if (!scope) {
    throw new Error(
      `verify('${statement}')를 절차 밖에서 불렀다. 화면과 증적 문서가 절차 아래에 검증 문장을 보여주므로 ` +
        'test.step() 안에서만 부를 수 있다 (SPEC §4)',
    );
  }

  const passed = isDeepStrictEqual(actual, expected);
  const result: AssertionResult = { statement, status: passed ? 'PASS' : 'FAIL', actual, expected };
  // blocker 표시는 '이 실패로 멈췄다'는 뜻이다. 통과한 문장에는 붙이지 않는다 (types.ts 주석)
  if (!passed && options?.blocker) result.blocker = true;
  scope.assertions.push(result);

  if (!passed && scope.line === undefined) {
    // verify 자신의 프레임을 지워야 스택 첫 줄이 테스트 코드의 호출 위치가 된다
    const here = new Error();
    Error.captureStackTrace(here, verify);
    scope.line = callerLine(here);
  }
  if (!passed && options?.blocker) throw new BlockerStop(statement);

  return passed;
}
