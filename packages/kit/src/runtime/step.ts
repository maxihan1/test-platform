// 절차 1단계를 돌리고 StepResult 한 건을 조립한다. 판정과 중단 규칙이 전부 여기 모인다 (SPEC §4)

import type { ItemStatus, ShapeCheck, StepResult } from '../types.js';
import { callerLine } from './callsite.js';
import { runScope, stepScope, type RunScope, type StepScope } from './context.js';
import { 알린다 } from './progress.js';
import { BlockerStop } from './verify.js';

// 멈춘 절차 뒤로는 돌지 않는다는 내부 신호. 케이스 본문을 빠져나가는 용도로만 쓴다 (SPEC §4)
export class StopTest extends Error {
  constructor() {
    super('앞 절차에서 실행이 중단됐다');
    this.name = 'StopTest';
  }
}

/** 실패 사유 한 줄 꼴 — 「응답 형식이 API 문서와 다릅니다 — POST /v1/pushes 201 · 필수 필드 없음 — status」. 화면 낱말은 도메인/API §8.13 */
export const 모양문장 = (c: ShapeCheck): string =>
  `응답 형식이 API 문서와 다릅니다 — ${c.method} ${c.path} ${c.status} · ${c.problems?.[0] ?? ''}`;

/** 같은 절차에 그 코드를 기대값으로 둔 확인 문장(`verify(…, 503)`)이 없으면 케이스가 기대하지 않은 서버 오류다. 같은 (방식 · 경로 · 코드)는 한 줄 */
function 서버오류를적는다(scope: StepScope): void {
  const 기대한코드 = new Set(scope.assertions.map((a) => a.expected));
  const 적은줄 = new Set<string>();
  for (const { method, path, status } of scope.서버오류 ?? []) {
    const statement = `서버 오류 없이 응답한다 — ${method} ${path} ${status}`;
    if (기대한코드.has(status) || 적은줄.has(statement)) continue;
    적은줄.add(statement);
    scope.assertions.push({ statement, status: 'FAIL', actual: status, expected: '500 미만' });
  }
}

export interface StepOptions {
  // 검수 문서에 "이 화면이 이렇게 나왔다"를 넣어야 할 때 쓴다. 기본값은 false (SPEC §4)
  capture?: boolean;
}

export interface StepOutcome {
  stopped: boolean;
  // 예외로 멈춘 경우의 원본 에러. 호출자가 Playwright에 그대로 올려 위치와 메시지를 보존한다
  fatal?: unknown;
}

export async function runStep(
  run: RunScope,
  title: string,
  body: () => Promise<void> | void,
  options?: StepOptions,
): Promise<StepOutcome> {
  const seq = ++run.seq;
  알린다(seq, title);
  const scope: StepScope = { assertions: [] };
  const startedAt = Date.now();

  let error: StepResult['error'];
  let fatal: unknown;
  let stopped = false;

  if (run.phase) run.phase.inStep++;
  try {
    await stepScope.run(scope, async () => {
      await body();
    });
  } catch (thrown) {
    stopped = true;
    // blocker 실패는 이미 검증 문장에 표시가 남았다. 예외가 아니므로 error를 채우지 않는다
    if (!(thrown instanceof BlockerStop)) {
      fatal = thrown;
      const err = thrown instanceof Error ? thrown : new Error(String(thrown));
      error = { message: err.message, ...(err.stack === undefined ? {} : { stack: err.stack }) };
      if (scope.line === undefined) scope.line = callerLine(err);
      if (!('실패요소' in scope)) scope.실패요소 = scope.마지막요소;
    }
  } finally {
    if (run.phase) run.phase.inStep--;
  }

  const durationMs = Date.now() - startedAt;
  // 모양 실패는 shapeChecks 줄로만 남고 절차 결과는 확인 문장이 정한다. 대신 기대하지 않은 5xx 는 kit 이 확인 문장을 더해 실패로 만든다 (도메인/API §3.8)
  서버오류를적는다(scope);
  const failed = error !== undefined || scope.assertions.some((a) => a.status === 'FAIL');
  const status: ItemStatus = failed ? 'FAIL' : 'PASS';
  if (failed) run.failed = true;
  if (stopped) run.stopped = true;
  if (failed && run.firstFailure === undefined) {
    // 케이스의 실패한 확인 문장이 먼저다 — 서버 오류 줄은 절차 끝에 더해 뒤에 선다. 확인 문장이 없으면 절차를 멈춘 예외다
    run.firstFailure = scope.assertions.find((a) => a.status === 'FAIL')?.statement ?? error?.message;
  }

  // 통과한 화면은 아무도 열어보지 않는다. 실패했거나 증적용으로 지정한 절차만 찍는다 (SPEC §4)
  // 표시는 실패한 절차에만 — 증적용으로 찍은 통과 화면에 짚을 문제가 없다. 모양 실패처럼 굳힌 때가 없으면 마지막 요소다
  const 짚을요소 = '실패요소' in scope ? scope.실패요소 : scope.마지막요소;
  const screenshotPath = failed || options?.capture === true ? await run.capture(seq, failed ? 짚을요소 : undefined) : undefined;

  const result: StepResult = { seq, title, status, durationMs, startedAt: new Date(startedAt).toISOString(), assertions: scope.assertions };
  if (scope.line !== undefined) result.line = scope.line;
  if (screenshotPath !== undefined) result.screenshotPath = screenshotPath;
  if (scope.httpTrace !== undefined) result.httpTrace = scope.httpTrace;
  if (scope.shapeChecks !== undefined) result.shapeChecks = scope.shapeChecks;
  if (error !== undefined) result.error = error;

  await run.emit(result);

  return { stopped, ...(fatal === undefined ? {} : { fatal }) };
}

// 테스트 코드가 부르는 절차 선언. Playwright의 test.step(title, body, options)과 인자 순서가 같다 (SPEC §4)
export async function step(
  title: string,
  body: () => Promise<void> | void,
  options?: StepOptions,
): Promise<void> {
  const run = runScope.getStore();
  if (!run) {
    throw new Error(`절차 '${title}'을 케이스 밖에서 선언했다. kit의 test(spec, ...) 안에서만 부를 수 있다`);
  }
  // 정리 안의 절차는 순번 · 판정을 바꾼다 — 정리는 판정에 안 든다 (공통/3-공유계약 「게임 시나리오 도구」)
  if (stepScope.getStore()?.정리 === true) throw new Error(`절차 '${title}'을 정리 안에서 선언했다. 정리에는 절차를 두지 않는다`);
  if (run.stopped) throw new StopTest();
  // 건너뛰어도 첫 절차로 친다. 체크를 푼 「만들기」 뒤에 오는 삭제도 시나리오 끝으로 미뤄야 한다
  if (run.phase) run.phase.started = true;

  // 건너뛴 절차도 순번을 차지한다. 빼 버리면 순번이 비고 「이 케이스가 준비를 세웠다」로 읽힌다 (SPEC 공통/3-공유계약 §5.1)
  if (run.skip?.has(title) === true) {
    await run.emit({ seq: ++run.seq, title, status: 'PASS', durationMs: 0, assertions: [], skipped: true });
    return;
  }

  const outcome = await runStep(run, title, body, options);
  // 예외는 원본 그대로 올린다. Playwright 출력에 원래 메시지와 위치가 남아야 한다
  if (outcome.fatal !== undefined) throw outcome.fatal;
  if (outcome.stopped) throw new StopTest();
}
