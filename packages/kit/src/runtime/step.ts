// 절차 1단계를 돌리고 StepResult 한 건을 조립한다. 판정과 중단 규칙이 전부 여기 모인다 (SPEC §4)

import type { ItemStatus, StepResult } from '../types.js';
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
    }
  }

  const durationMs = Date.now() - startedAt;
  const failed = error !== undefined || scope.assertions.some((a) => a.status === 'FAIL');
  const status: ItemStatus = failed ? 'FAIL' : 'PASS';
  if (failed) run.failed = true;
  if (stopped) run.stopped = true;
  if (failed && run.firstFailure === undefined) {
    run.firstFailure = scope.assertions.find((a) => a.status === 'FAIL')?.statement ?? error?.message;
  }

  // 통과한 화면은 아무도 열어보지 않는다. 실패했거나 증적용으로 지정한 절차만 찍는다 (SPEC §4)
  const screenshotPath = failed || options?.capture === true ? await run.capture(seq) : undefined;

  const result: StepResult = { seq, title, status, durationMs, assertions: scope.assertions };
  if (scope.line !== undefined) result.line = scope.line;
  if (screenshotPath !== undefined) result.screenshotPath = screenshotPath;
  if (scope.httpTrace !== undefined) result.httpTrace = scope.httpTrace;
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
  if (run.stopped) throw new StopTest();

  const outcome = await runStep(run, title, body, options);
  // 예외는 원본 그대로 올린다. Playwright 출력에 원래 메시지와 위치가 남아야 한다
  if (outcome.fatal !== undefined) throw outcome.fatal;
  if (outcome.stopped) throw new StopTest();
}
