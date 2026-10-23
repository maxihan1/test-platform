// 테스트 코드의 유일한 검증 수단. expect와 달리 문장·기대값·실제값을 결과에 남긴다 (SPEC §4)

import { isDeepStrictEqual } from 'node:util';

import type { AssertionResult } from '../types.js';
import { callerLine } from './callsite.js';
import { runScope, stepScope } from './context.js';

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

// 판정을 결과에 남기는 한 곳. 건너뛸 함수는 스택에서 그 위를 지워 케이스 코드의 호출 줄을 찾는다
function 남긴다(
  statement: string,
  passed: boolean,
  actual: unknown,
  expected: unknown,
  options: VerifyOptions | undefined,
  부른함수: (...args: never[]) => unknown,
): boolean {
  const scope = stepScope.getStore();
  if (!scope) {
    throw new Error(
      `verify('${statement}')를 절차 밖에서 불렀다. 화면과 증적 문서가 절차 아래에 검증 문장을 보여주므로 ` +
        'test.step() 안에서만 부를 수 있다 (SPEC §4)',
    );
  }

  // blocker 는 「준비가 됐나」를 본다. 통과 · 실패와 상관없이 시험 대상을 본 판정이 나오면 준비 구간이 끝난다
  const phase = runScope.getStore()?.phase;
  if (phase && options?.blocker !== true) phase.judged = true;

  const result: AssertionResult = { statement, status: passed ? 'PASS' : 'FAIL', actual, expected };
  // blocker 표시는 '이 실패로 멈췄다'는 뜻이다. 통과한 문장에는 붙이지 않는다 (types.ts 주석)
  if (!passed && options?.blocker) result.blocker = true;
  scope.assertions.push(result);

  if (!passed && scope.line === undefined) {
    // 도우미 자신의 프레임을 지워야 스택 첫 줄이 테스트 코드의 호출 위치가 된다
    const here = new Error();
    Error.captureStackTrace(here, 부른함수);
    scope.line = callerLine(here);
  }
  if (!passed && options?.blocker) throw new BlockerStop(statement);

  return passed;
}

async function 같다(statement: string, actual: unknown, expected: unknown, options?: VerifyOptions): Promise<boolean> {
  return 남긴다(statement, isDeepStrictEqual(actual, expected), actual, expected, options, 같다);
}

/**
 * 데이터 대조 — 서버가 준 값을 기획서 값과 견주고, 게임 항목이면 그 요소 열쇠의 서버 값을 게임 지도에 남긴다 (공통/3-공유계약 「게임 테스트 타입」 elementChecks).
 * 판정은 verify 와 같다
 */
async function element(statement: string, key: string, serverValue: unknown, expected: unknown, options?: VerifyOptions): Promise<boolean> {
  const passed = isDeepStrictEqual(serverValue, expected);
  // 절차 밖이면 아래 남긴다 가 던진다 — 그 전에 지도 줄만 새지 않게 같은 조건을 본다
  if (stepScope.getStore()) runScope.getStore()?.elementChecks?.push({ key, serverValue, same: passed });
  return 남긴다(statement, passed, serverValue, expected, options, element);
}

const 넷째자리 = (n: number): number => Math.round(n * 10_000) / 10_000;

/**
 * 확률 검정 — 나온 횟수의 비율이 결과마다 기대 확률 ± 허용 오차 안인지 본다 (도메인/게임 §3.10 「확률 세 겹」 ③).
 * 허용 오차는 비율 차이다 — 0.03 이면 기대 55% 에 52~58% 를 통과로 본다. 횟수 · 허용 오차는 AI 가 추천하고 사람이 고친다(기대값 칸).
 * 기대 확률에 없는 결과가 한 번이라도 나오면 그 결과의 기대 확률은 0 이라 실패한다
 */
async function rates(
  statement: string,
  counts: Record<string, number>,
  expected: Record<string, number>,
  tolerance: number,
  options?: VerifyOptions,
): Promise<boolean> {
  if (!(tolerance > 0 && tolerance < 1)) throw new Error(`verify.rates('${statement}') 의 허용 오차는 0 과 1 사이여야 한다: ${tolerance}`);
  for (const [k, p] of Object.entries(expected)) {
    if (!(p >= 0 && p <= 1)) throw new Error(`verify.rates('${statement}') 의 기대 확률 ${k} 는 0 과 1 사이여야 한다: ${p}`);
  }
  for (const [k, n] of Object.entries(counts)) {
    if (!Number.isInteger(n) || n < 0) throw new Error(`verify.rates('${statement}') 의 횟수 ${k} 는 0 이상의 정수여야 한다: ${n}`);
  }
  const 시도 = Object.values(counts).reduce((a, b) => a + b, 0);
  const 결과들 = [...new Set([...Object.keys(expected), ...Object.keys(counts)])];
  const 비율 = Object.fromEntries(결과들.map((k) => [k, 시도 === 0 ? 0 : 넷째자리((counts[k] ?? 0) / 시도)]));
  // 부동소수 끝자리로 경계값이 떨어지지 않게 아주 작은 여유를 둔다
  const passed =
    시도 > 0 &&
    결과들.every((k) => (k in expected ? Math.abs((counts[k] ?? 0) / 시도 - expected[k]!) <= tolerance + 1e-9 : (counts[k] ?? 0) === 0));
  return 남긴다(statement, passed, { 시도, 비율 }, { 확률: expected, 허용오차: tolerance }, options, rates);
}

// 테스트 코드는 verify 하나만 import 한다 — 도우미는 그 밑에 단다(test.step 과 같은 꼴)
export const verify = Object.assign(같다, { element, rates });
