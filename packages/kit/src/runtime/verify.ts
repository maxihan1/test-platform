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
  notice?: string,
): boolean {
  const scope = stepScope.getStore();
  if (!scope) {
    throw new Error(
      `verify('${statement}')를 절차 밖에서 불렀다. 화면과 증적 문서가 절차 아래에 검증 문장을 보여주므로 ` +
        'test.step() 안에서만 부를 수 있다 (SPEC §4)',
    );
  }
  if (scope.정리 === true) throw new Error(`verify('${statement}')를 정리 안에서 불렀다. 정리는 판정에 안 든다 — 정리 확인은 하지 않는다`);

  // blocker 는 「준비가 됐나」를 본다. 통과 · 실패와 상관없이 시험 대상을 본 판정이 나오면 준비 구간이 끝난다
  const phase = runScope.getStore()?.phase;
  if (phase && options?.blocker !== true) phase.judged = true;

  const result: AssertionResult = { statement, status: passed ? 'PASS' : 'FAIL', actual, expected };
  // blocker 표시는 '이 실패로 멈췄다'는 뜻이다. 통과한 문장에는 붙이지 않는다 (types.ts 주석)
  if (!passed && options?.blocker) result.blocker = true;
  if (passed && notice !== undefined) result.notice = notice;
  scope.assertions.push(result);

  if (!passed && !('실패요소' in scope)) scope.실패요소 = scope.마지막요소;
  if (!passed && scope.line === undefined) {
    // 도우미 자신의 프레임을 지워야 스택 첫 줄이 테스트 코드의 호출 위치가 된다
    const here = new Error();
    Error.captureStackTrace(here, 부른함수);
    scope.line = callerLine(here);
  }
  if (!passed && options?.blocker) throw new BlockerStop(statement);

  return passed;
}

const 숫자 = /\d/;
const 구두점 = /\p{P}/u;

/**
 * 띄어쓰기와 구두점을 걷어 낸다. 끊김[i] 는 걷어 낸 자리가 글[i] 바로 앞에 있었나다 — 숫자 경계를 보려고 남긴다.
 * - 와 % 는 숫자의 뜻을 바꿔(-10 · 50%) 남기고, 숫자 사이 구두점(1,100 · 1.5)도 남긴다
 */
function 걷는다(원글: string): { 글: string; 끊김: boolean[] } {
  let 글 = '';
  const 끊김: boolean[] = [];
  let 끊 = false;
  for (let i = 0; i < 원글.length; i++) {
    const c = 원글[i]!;
    const 숫자사이 = 숫자.test(원글[i - 1] ?? '') && 숫자.test(원글[i + 1] ?? '');
    if (/\s/.test(c) || (구두점.test(c) && c !== '-' && c !== '%' && !숫자사이)) {
      끊 = true;
      continue;
    }
    끊김.push(끊);
    글 += c;
    끊 = false;
  }
  끊김.push(끊);
  return { 글, 끊김 };
}

// 걷어 낸 자리 없이 숫자 · 남긴 구두점(1,100 의 , · -100 의 - · 50% 의 %)이 붙어 있으면 다른 수다
const 붙었다 = (글: string, 끊김: boolean[], 경계: number, 옆: number): boolean =>
  !끊김[경계] && (숫자.test(글[옆] ?? '') || 구두점.test(글[옆] ?? ''));

/**
 * 기대 글의 낱말 조각이 화면 글에 차례대로 다 있나 (공통/2 §4 「글 비교」).
 * 띄어쓰기 · 구두점은 양쪽에서 걷어 낸다. 화면 글이 더 길어도 된다 — 기획서에서 빠진 빈칸 자리의 값이다.
 * 숫자로 시작하거나 끝나는 조각은 숫자가 붙은 자리를 건너뛴다(100 ≠ 1100 · 1,100)
 */
export function 낱말이차례로있다(actual: string, expected: string): boolean {
  const 기대 = 걷는다(expected);
  const 조각들: string[] = [];
  for (let i = 0; i < 기대.글.length; i++) {
    if (i === 0 || 기대.끊김[i]) 조각들.push('');
    조각들[조각들.length - 1] += 기대.글[i];
  }
  if (조각들.length === 0) return false;

  const 화면 = 걷는다(actual);
  let 어디부터 = 0;
  for (const 조각 of 조각들) {
    const 앞숫자 = 숫자.test(조각[0]!);
    const 뒤숫자 = 숫자.test(조각.at(-1)!);
    const 끝 = (at: number): number => at + 조각.length;
    let at = 화면.글.indexOf(조각, 어디부터);
    while (at !== -1 && ((앞숫자 && 붙었다(화면.글, 화면.끊김, at, at - 1)) || (뒤숫자 && 붙었다(화면.글, 화면.끊김, 끝(at), 끝(at))))) {
      at = 화면.글.indexOf(조각, at + 1);
    }
    if (at === -1) return false;
    어디부터 = 끝(at);
  }
  return true;
}

// 알림 한 줄이 결과 화면을 덮지 않게 양쪽 글을 자른다
const 알림글 = (글: string): string => (글.length > 200 ? `${글.slice(0, 200)}…` : 글);

async function 같다(statement: string, actual: unknown, expected: unknown, options?: VerifyOptions): Promise<boolean> {
  if (isDeepStrictEqual(actual, expected)) return 남긴다(statement, true, actual, expected, options, 같다);
  if (typeof actual === 'string' && typeof expected === 'string' && 낱말이차례로있다(actual, expected)) {
    const notice = `기획서 문장과 글자가 다름(기대 ${알림글(expected)} / 화면 ${알림글(actual)})`;
    return 남긴다(statement, true, actual, expected, options, 같다, notice);
  }
  return 남긴다(statement, false, actual, expected, options, 같다);
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

/**
 * 로그 견주기 — 기획서 규칙 하나에 한 번. values 는 케이스가 고른 줄에서 꺼낸 값이다(줄 꼴은 케이스 몫).
 * 한 줄도 없으면 통과가 아니라 「확인 못 함」이다 — 판정 값을 늘리지 않고 문장 머리로 가른다 (도메인/게임 §3.10 통과 규칙 2)
 */
async function log(
  statement: string,
  values: unknown[],
  expected: number | { min: number; max: number },
  options?: VerifyOptions & { least?: number },
): Promise<boolean> {
  const least = options?.least ?? 1;
  const 맞나 = (v: unknown): boolean =>
    typeof expected === 'number' ? v === expected : typeof v === 'number' && v >= expected.min && v <= expected.max;
  const 벗어난값 = values.filter((v) => !맞나(v));
  const passed = values.length > 0 && values.length >= least && 벗어난값.length === 0;
  const 문장 = values.length === 0 ? `확인 못 함 — ${statement}` : statement;
  const 기대 = typeof expected === 'number' ? { 값: expected, 최소줄수: least } : { 범위: expected, 최소줄수: least };
  return 남긴다(문장, passed, { 줄수: values.length, 벗어난값: 벗어난값.slice(0, 20) }, 기대, options, log);
}

/** 판정에 안 드는 표시 — 「설명 안 되는 줄」을 사람이 보게 NA 문장으로 남긴다 (도메인/게임 §3.10 통과 규칙 4) */
async function note(statement: string, actual: unknown): Promise<void> {
  const scope = stepScope.getStore();
  if (!scope) {
    throw new Error(`verify.note('${statement}')를 절차 밖에서 불렀다. test.step() 안에서만 부를 수 있다 (SPEC §4)`);
  }
  scope.assertions.push({ statement, status: 'NA', actual, expected: null });
}

// 테스트 코드는 verify 하나만 import 한다 — 도우미는 그 밑에 단다(test.step 과 같은 꼴)
export const verify = Object.assign(같다, { element, rates, log, note });
