// 절차 1단계를 돌리고 StepResult 한 건을 조립한다. 판정과 중단 규칙이 전부 여기 모인다 (SPEC §4)

import type { ItemStatus, StepResult } from '../types.js';
import { callerLine } from './callsite.js';
import { stepScope, type RunScope, type StepScope } from './context.js';
import { BlockerStop } from './verify.js';

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
