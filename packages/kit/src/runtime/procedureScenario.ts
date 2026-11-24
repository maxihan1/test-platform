// E2E 프로시저 단계 — 앱 · 게임 단계가 프로시저 안 케이스를 고르면 그 프로시저를 통째로 돌고 케이스마다의 판정을 돌려준다 (도메인/시나리오 §3.7 결정 17 · 공통/3 「프로시저 단계」)

import { test as base } from '@playwright/test';

import type { ProcedureSpec, ScenarioCaseResult, StepResult, TcId } from '../types.js';
import { captureApp } from './app.js';
import { bodyArgs, emit, platformLabel, type ProcedureBody } from './bodyArgs.js';
import { runScope, type ProcScope, type RunScope } from './context.js';
import { 선언했나, type CaseHandle } from './defineCase.js';
import { 게임증적을남긴다 } from './game.js';
import { 끝정리 } from './gameScenario.js';
import { 남은케이스를채운다, 멈춤을가른다, 보류인가, 한도초과 } from './procedure.js';
import { BLOCKED, PROCEDURE_CHANGED, STEP_ATTACHMENT } from './protocol.js';
import { registerScenarioCase, registerScenarioPhone, type ScenarioCaseInput, type ScenarioCaseOutcome, type ScenarioCaseRunner } from './scenario.js';
import { StopTest } from './step.js';

function errorOf(thrown: unknown): { message: string; stack?: string } {
  const err = thrown instanceof Error ? thrown : new Error(String(thrown));
  return { message: err.message, ...(err.stack === undefined ? {} : { stack: err.stack }) };
}

/** 고정 spec 은 부품의 tcId 로 꺼낸다 — 그 프로시저의 어느 케이스로 꺼내도 프로시저 전체가 돈다 */
export function 프로시저를시나리오에올린다(procedure: ProcedureSpec, body: ProcedureBody): void {
  for (const c of procedure.cases) registerScenarioCase(c.tcId, 프로시저단계(procedure, body, c.tcId));
  if (procedure.platforms.includes('android')) registerScenarioPhone();
}

export function 프로시저단계(procedure: ProcedureSpec, body: ProcedureBody, 고른: TcId): ScenarioCaseRunner {
  const cases = procedure.cases as CaseHandle<unknown, unknown>[];
  return async (input: ScenarioCaseInput): Promise<ScenarioCaseOutcome> => {
    const { driver, game, seq } = input;
    // 판정 전에 끝나는 단계는 케이스를 안 돌았다 — cases 를 안 싣는다
    const 못돈다 = (message: string): ScenarioCaseOutcome => ({ seq, steps: [], failed: true, error: { message } });
    if (!선언했나(procedure.platforms, input.platform)) return 못돈다(`${procedure.procId}은 ${platformLabel(input.platform)} 환경을 선언하지 않았다`);
    if (driver === undefined) return 못돈다(`${procedure.procId}에 폰 연결이 없다`);
    // 실행을 만든 뒤 프로시저가 바뀌었다 — 단독 실행과 같이 돌지 않고 케이스마다 알린다
    if (input.cases !== undefined && (input.cases.length !== cases.length || input.cases.some((c, i) => c.tcId !== cases[i]!.tcId))) {
      return {
        ...못돈다(`${procedure.procId}의 케이스 목록이 요청과 다르다 — 실행을 만든 뒤 프로시저가 바뀌었다`),
        cases: input.cases.map((c) => ({ tcId: c.tcId, status: 'NA', durationMs: 0, error: { message: PROCEDURE_CHANGED } })),
      };
    }
    // 고른 케이스는 러너가 값 꽂기까지 채운 부품 값이다
    const 받은 = cases.map((c) => (c.tcId === 고른 ? { tcId: c.tcId, params: input.params as Record<string, unknown>, expected: input.expected as Record<string, unknown> } : input.cases?.find((x) => x.tcId === c.tcId) ?? { tcId: c.tcId, params: {}, expected: {} }));

    const steps = cases.map((): StepResult[] => []);
    const 모든: StepResult[] = [];
    const 한도 = input.caseTimeoutMs ?? 0;
    let 타이머: ReturnType<typeof setTimeout> | undefined;
    let 끊는다 = (): void => {};
    const 끊김 = new Promise<{ thrown: unknown }>((done) => {
      끊는다 = () => done({ thrown: 한도초과 });
    });
    const proc: ProcScope = {
      cases,
      at: cases.findIndex((c) => !보류인가(c)),
      열림: true,
      시작: Date.now(),
      steps,
      results: cases.map((c, i) => (c.held === undefined ? undefined : { tcId: c.tcId, status: 'NA', durationMs: 0, steps: steps[i]!, error: { message: c.held } })),
      안낸: [],
      // 판정은 단계 결과로 한 번에 돌려준다 — 러너가 케이스 줄을 따로 읽지 않는다
      낸다: () => Promise.resolve(),
      받은,
      한도,
      한도글: `단계 제한 시간 ${String(한도)}ms 를 넘었다`,
      // 시나리오 테스트에는 Playwright 한도가 없다 — kit 이 케이스마다 시계를 다시 건다. 판정을 kit 한 곳이 내야 해서다 (공통/3 「프로시저 단계」 「한도」)
      한도를건다: () => {
        clearTimeout(타이머);
        if (한도 > 0) 타이머 = setTimeout(끊는다, 한도);
      },
    };
    // 보류 케이스는 main 에 못 들어온다(K13). 그래도 다 보류면 돌린 것이 없다 — 단계는 다 통과해야 통과라 초록으로 두지 않는다 (결정 17)
    if (proc.at === -1) return { ...못돈다(`${procedure.procId}의 케이스가 모두 보류다`), cases: proc.results.map((r) => 판정줄(r!)) };

    const side = { driver, ...(game && { game }) };
    const run: RunScope = {
      seq,
      failed: false,
      stopped: false,
      // 러너가 건넨 표시판이 없으면(검사) 만든다 — 준비 구간을 가르는 데 쓴다
      phase: input.phase ?? { started: false, inStep: 0, judged: false },
      proc,
      capture: (s, 요소) => captureApp(driver, s, 요소),
      // 절차는 그때 차례인 케이스에 붙는다 — 케이스 사이 절차는 다음 케이스 것이고 끝 정리는 마지막으로 돈 케이스 것이다
      emit: async (result) => {
        result.tcId = cases[proc.at]!.tcId;
        proc.steps[proc.at]!.push(result);
        모든.push(result);
        // trace 를 단계로 가르는 경계다 — 케이스 단계와 같다 (도메인/시나리오 §7 「실패 기록」)
        if (process.env.PLATFORM_TRACE === '1') await emit(base.info(), result);
      },
    };

    if (process.env.PLATFORM_TRACE === '1') await base.info().attach(STEP_ATTACHMENT, { body: JSON.stringify({ seq }), contentType: 'application/json' });
    // 앞 게임 단계의 오류가 이 단계 실패 기록에 섞이지 않게 시작 자리를 받아 둔다 — 케이스 단계와 같다
    game?.다시켜기전오류를꺼낸다();
    const 오류시작 = game === undefined ? 0 : await game.errors().then((r) => r.last, () => 0);

    proc.한도를건다();
    const 달림 = runScope.run(run, async () => {
      await body(bodyArgs(procedure.procId, input.request, undefined, side, input.apiAuths ?? [], input.apiDoc, input.tokenRequest, input.adminKey));
      // test.case 를 빼먹은 채 끝나면 그 케이스가 판정 없이 초록으로 남는다 (K20)
      if (proc.열림) throw new Error(`${cases[proc.at]!.tcId}: test.case 를 부르지 않고 본문이 끝났다`);
    });
    // 한도에 끊기면 본문을 기다리지 않는다 — 멈춤 표시를 세워 두면 본문의 다음 절차가 스스로 멈춘다. 폰은 러너가 시나리오 끝에 닫는다
    const 끝: { thrown?: unknown } = await Promise.race([달림.then(() => ({}), (thrown: unknown) => ({ thrown })), 끊김]);
    clearTimeout(타이머);

    let 끝난뒤 = false;
    let error: { message: string; stack?: string } | undefined;
    if ('thrown' in 끝) {
      const { thrown } = 끝;
      // 흐름이 다 끝난 뒤에 온 멈춤 신호는 마지막 케이스 뒤에 둔 절차나 한 번 더 부른 test.case 다 — 단독 실행과 같이 초록으로 넘기지 않는다
      끝난뒤 = thrown instanceof StopTest && !proc.열림 && !cases.some((c, i) => i > proc.at && 보류인가(c));
      멈춤을가른다(run, proc, thrown);
      const 멈춘 = proc.results[proc.at];
      // 단계 오류는 흐름을 깬 것이다. 준비 구간에서 깨져 그 케이스가 Blocked 로 남아도 난 예외를 싣는다 — 안 그러면 왜 멈췄는지가 사라진다
      if (끝난뒤) error = { message: `${procedure.procId}: 마지막 케이스 뒤에 절차를 두었거나 test.case 를 다시 불렀다 — 그 뒤는 돌지 않았다` };
      else if (thrown === 한도초과) error = { message: proc.한도글! };
      else if (!(thrown instanceof StopTest)) error = errorOf(thrown);
      else if (멈춘?.error !== undefined && 멈춘.error.message !== BLOCKED) error = 멈춘.error;
    }
    남은케이스를채운다(proc);

    const failed = 끝난뒤 || proc.results.some((r, i) => r?.status !== 'PASS' && !보류인가(cases[i]!));
    if (failed && game !== undefined) await 게임증적을남긴다(game, process.env.PLATFORM_RUN_ID ?? '0', process.env.PLATFORM_HISTORY_ID ?? '0', 오류시작);
    // 끝 정리 절차는 마지막으로 돈 케이스에 붙는다 — 판정 줄의 steps 가 같은 배열이라 따로 안 옮긴다
    await 끝정리(run);
    await game?.입력을거둔다();
    // 한도에 끊긴 본문은 아직 돌 수 있다 — 늦게 끝난 절차가 돌려준 결과를 바꾸지 않게 복사해 낸다
    return { seq: run.seq, steps: [...모든], failed, ...(error && { error }), cases: proc.results.map((r) => 판정줄(r!)) };
  };
}

function 판정줄(r: NonNullable<ProcScope['results'][number]>): ScenarioCaseResult {
  return { tcId: r.tcId, status: r.status, durationMs: r.durationMs, ...(r.error && { error: r.error }), ...(r.blockedBy !== undefined && { blockedBy: r.blockedBy }) };
}
