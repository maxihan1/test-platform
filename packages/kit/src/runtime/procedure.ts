// 테스트 프로시저를 돌린다 — test.case 로 케이스 구간을 가르고 케이스가 끝나는 대로 판정을 정해 밖으로 낸다 (SPEC 공통/2 §4 「테스트 프로시저」 · 도메인/러너 §5.2 「프로시저 실행」)

import { test as base, type TestInfo } from '@playwright/test';

import { PC항목인가, type CaseResult, type ProcedureSpec, type StepResult, type TcId } from '../types.js';
import { 어드민키, 인증목록 } from './apiAuth.js';
import { 판읽기 } from './apiShape.js';
import { captureApp } from './app.js';
import { 앱테스트, type AppSide } from './appFixture.js';
import { bodyArgs, emit, platformLabel, type ProcedureBody } from './bodyArgs.js';
import { runScope, stepScope, type ProcScope, type RunScope } from './context.js';
import { keepsAppData, 선언했나, 실어켤값, type CaseHandle } from './defineCase.js';
import { captureGame, isGame } from './game.js';
import { 앱함수를적게건다 } from './gameFns.js';
import { 끝정리 } from './gameScenario.js';
import { injectedAccounts, injectedCases, resolveInputs, type RawInputs } from './inputs.js';
import { 판정을알린다 } from './progress.js';
import { BLOCKED, CASE_ATTACHMENT, PROCEDURE_CHANGED } from './protocol.js';
import { StopTest } from './step.js';

// 본문이 케이스 한도에 끊겼다는 표시 — 예외와 같은 자리에서 가른다. E2E 프로시저 단계(procedureScenario.ts)도 같은 표시로 가른다
export const 한도초과 = Symbol('한도 초과');

export const 보류인가 = (c: { held?: string }): boolean => c.held !== undefined;

// 러너가 넘긴 케이스별 입력에서 그 케이스 것을 꺼낸다. 사람이 손으로 돌리면 받은 것이 없어 케이스마다 스키마 기본값이다 — 계정 칸은 두 길 다 채운다.
// PLATFORM_PARAMS 는 케이스 하나의 값이라 프로시저에 쓰지 않는다 (공통/3-공유계약 「테스트 프로시저 타입」)
export function 입력값(받은: ProcScope['받은'], tcId: TcId): RawInputs {
  const 준 = 받은?.find((c) => c.tcId === tcId);
  return { params: 준?.params ?? {}, expected: 준?.expected ?? {}, accounts: injectedAccounts() };
}

/** 판정 한 건을 밖으로 낸다 — 러너가 읽는 stdout 줄과 Playwright 결과에 남는 첨부(작성의 돌려 보기가 읽는다). 남기다 깨져도 이미 난 판정과 흐름은 건드리지 않는다 */
async function 판정을낸다(testInfo: TestInfo, result: CaseResult): Promise<void> {
  판정을알린다(result);
  await testInfo
    .attach(CASE_ATTACHMENT, { body: JSON.stringify(result), contentType: 'application/json' })
    .catch((err: unknown) => console.error(`[kit] 케이스 판정을 남기지 못했다: ${err instanceof Error ? err.message : String(err)}`));
}

/** 난 판정을 난 차례대로 밖으로 낸다 */
async function 흘린다(proc: ProcScope): Promise<void> {
  while (proc.안낸.length > 0) await proc.낸다(proc.results[proc.안낸.shift()!]!);
}

/** 통과가 아닌 앞 케이스 가운데 가장 가까운 것. 그 케이스가 Blocked 면 막은 케이스를 물려받아 늘 스스로 깨지거나 틀린 케이스를 가리킨다 */
function 막은케이스(proc: ProcScope, k: number): TcId | undefined {
  for (let i = k - 1; i >= 0; i--) {
    const r = proc.results[i];
    // 보류로 건너뛴 케이스는 아무것도 깨뜨리지 않았다
    if (r === undefined || r.status === 'PASS' || 보류인가(proc.cases[i]!)) continue;
    return r.blockedBy ?? r.tcId;
  }
  return undefined;
}

/** at 케이스의 판정을 남긴다. 한도에 끊긴 케이스는 구간이 끝난 때가 없다 */
function 케이스를닫는다(run: RunScope, proc: ProcScope, 판정: Pick<CaseResult, 'status' | 'error' | 'blockedBy'>, 끊겼나 = false): void {
  const 끝 = Date.now();
  proc.results[proc.at] = {
    tcId: proc.cases[proc.at]!.tcId,
    ...판정,
    durationMs: 끝 - proc.시작,
    startedAt: new Date(proc.시작).toISOString(),
    ...(끊겼나 ? {} : { finishedAt: new Date(끝).toISOString() }),
    steps: proc.steps[proc.at]!,
    ...(run.elementChecks?.length ? { elementChecks: run.elementChecks } : {}),
    ...(run.apiCalls?.length ? { apiCalls: run.apiCalls } : {}),
  };
  proc.열림 = false;
  proc.안낸.push(proc.at);
  // 게임 기록은 케이스마다 새로 모은다 — 준비 구간에서 남긴 것까지 그 케이스 것이다
  if (run.elementChecks !== undefined) run.elementChecks = [];
  if (run.apiCalls !== undefined) run.apiCalls = [];
}

/** 다음 케이스로 넘어가 그 케이스의 시계와 한도를 새로 건다. 보류 케이스는 건너뛴다 */
function 다음케이스로(run: RunScope, proc: ProcScope): void {
  const 다음 = proc.cases.findIndex((c, i) => i > proc.at && !보류인가(c));
  if (다음 === -1) {
    // 마지막 케이스 뒤 절차는 붙을 케이스가 없다 — 뒤에 남은 보류 케이스의 준비 절차도 돌리지 않는다
    run.stopped = true;
    return;
  }
  proc.at = 다음;
  proc.열림 = true;
  proc.시작 = Date.now();
  if (run.phase) run.phase.judged = false;
  proc.한도를건다();
}

/**
 * 흐름을 멈춘 것을 at 케이스의 판정으로 가른다 (공통/2 §4 「케이스 판정」 표).
 * 판정이 이미 났으면 아무것도 안 한다 — 한도에 끊겨 정리 단계에서 가른 뒤에 본문의 예외가 뒤늦게 올라온다
 */
export function 멈춤을가른다(run: RunScope, proc: ProcScope, 까닭: unknown): void {
  if (!proc.열림) return;
  run.stopped = true;
  const 절차들 = proc.steps[proc.at]!;
  // 멈춤 신호는 blocker 확인이 틀렸을 때도, 본문이 삼킨 예외 뒤에 다음 절차를 돌리려 할 때도 온다.
  // 틀린 blocker 문장이 있을 때만 판정이 난 것이다 — 깨진 것이 아니다. 나머지는 아래에서 깨진 것으로 가른다
  if (까닭 instanceof StopTest && 절차들.some((s) => s.assertions.some((a) => a.blocker === true))) {
    케이스를닫는다(run, proc, { status: 'FAIL' });
    return;
  }
  const 막은 = 막은케이스(proc, proc.at);
  // 준비 구간(첫 판정 확인 전)에서 깨졌고 앞에 통과가 아닌 케이스가 있으면 그 케이스 탓이다
  if (run.phase?.judged !== true && 막은 !== undefined) {
    케이스를닫는다(run, proc, { status: 'NA', error: { message: BLOCKED }, blockedBy: 막은 }, 까닭 === 한도초과);
    return;
  }
  if (까닭 === 한도초과) {
    // 옛 꼴 케이스의 제한 시간 초과와 같은 글이다 — 화면이 이 꼴을 읽는다. Playwright 가 내는 글의 숫자는 합친 값이라 케이스 한도로 적는다.
    // E2E 단계는 그 단계의 글을 쓴다 (도메인/시나리오 §3.7 결정 17 「제한 시간은 케이스마다 건다」)
    케이스를닫는다(run, proc, { status: 'NA', error: { message: proc.한도글 ?? `Test timeout of ${String(proc.한도)}ms exceeded.` } }, true);
    return;
  }
  // 본문이 삼킨 예외는 멈춤 신호로만 올라온다 — 사유는 그 절차에 남은 오류다
  const 삼킨 = 까닭 instanceof StopTest ? 절차들.filter((s) => s.status === 'FAIL' && s.error !== undefined).at(-1)?.error : undefined;
  const err = 까닭 instanceof Error ? 까닭 : new Error(String(까닭));
  케이스를닫는다(run, proc, { status: 'FAIL', error: 삼킨 ?? { message: err.message, ...(err.stack === undefined ? {} : { stack: err.stack }) } });
}

/** 흐름이 멈춰 못 간 케이스를 Blocked 로 채운다 — 보류 케이스는 시작할 때 이미 판정이 났다. Blocked 를 정하는 것은 kit 한 곳이다 */
export function 남은케이스를채운다(proc: ProcScope): void {
  proc.cases.forEach((c, i) => {
    if (proc.results[i] !== undefined) return;
    const 막은 = 막은케이스(proc, i);
    proc.results[i] = { tcId: c.tcId, status: 'NA', durationMs: 0, steps: proc.steps[i]!, error: { message: BLOCKED }, ...(막은 !== undefined && { blockedBy: 막은 }) };
    proc.안낸.push(i);
  });
}

/** 케이스 구간 하나. 본문은 그 케이스 선언의 스키마로 검증한 입력값 · 기대값을 받는다 (공통/2 §4 「케이스 구간과 준비 구간」) */
export async function testCase<P, E>(케이스: CaseHandle<P, E>, 본문: (args: { params: P; expected: E }) => Promise<void> | void): Promise<void> {
  const run = runScope.getStore();
  const proc = run?.proc;
  if (run === undefined || proc === undefined) {
    throw new Error(`test.case(${케이스.tcId})를 프로시저 밖에서 불렀다. test(procedure, ...) 본문에서만 부를 수 있다`);
  }
  // 절차 안에서 부르면 케이스의 절차가 그 절차 밑으로 들어가 번호와 판정이 꼬인다 (K20)
  if (stepScope.getStore() !== undefined) throw new Error(`test.case(${케이스.tcId})를 절차 안에서 불렀다. 본문 맨 바깥에서만 부른다`);
  if (run.stopped) throw new StopTest();
  // 보류 케이스는 그 구간만 건너뛴다 — 미실행으로 남고 뒤 케이스는 그대로 돈다
  if (보류인가(케이스)) return;
  // 차례가 어긋난 채 돌면 절차와 판정이 다른 케이스에 붙는다 (K20)
  const 차례 = proc.cases[proc.at]!;
  if (차례 !== 케이스) throw new Error(`test.case(${케이스.tcId})가 cases 차례와 다르다 — ${차례.tcId} 차례다`);

  await 본문(resolveInputs(케이스, 입력값(proc.받은, 케이스.tcId)));
  // 한도에 끊긴 본문이 뒤늦게 끝나도 정리 단계에서 난 판정을 덮지 않는다
  if (run.stopped) throw new StopTest();
  케이스를닫는다(run, proc, { status: proc.steps[proc.at]!.some((s) => s.status === 'FAIL') ? 'FAIL' : 'PASS' });
  // 다음 케이스의 시계와 한도를 먼저 걸고 낸다 — 내는 사이에 한도가 오면 그것은 다음 케이스 몫이다
  다음케이스로(run, proc);
  await 흘린다(proc);
}

export function 프로시저를등록한다(procedure: ProcedureSpec, body: ProcedureBody): void {
  const cases = procedure.cases as CaseHandle<unknown, unknown>[];
  앱테스트()(procedure.name, async ({ request, appSession }, testInfo) => {
    const 본문시작 = Date.now();
    const 디바이스 = testInfo.project.name;
    base.skip(!선언했나(procedure.platforms, 디바이스), `${procedure.procId}은 ${platformLabel(디바이스)} 환경을 선언하지 않았다`);

    const 낸다 = (result: CaseResult): Promise<void> => 판정을낸다(testInfo, result);
    // 실행을 만든 뒤 프로시저가 바뀌었다 — 본문을 돌지 않고 요청의 케이스마다 알린다. 판정이 아니라 테스트도 실패로 끝내지 않는다 (도메인/러너 §5.2 「케이스별 입력」)
    const 받은 = injectedCases();
    if (받은 !== undefined && (받은.length !== cases.length || 받은.some((c, i) => c.tcId !== cases[i]!.tcId))) {
      for (const c of 받은) await 낸다({ tcId: c.tcId, status: 'NA', durationMs: 0, steps: [], error: { message: PROCEDURE_CHANGED } });
      base.skip(true, `${procedure.procId}의 케이스 목록이 요청과 다르다 — 실행을 만든 뒤 프로시저가 바뀌었다`);
    }

    const 첫 = cases.findIndex((c) => !보류인가(c));
    const steps = cases.map((): StepResult[] => []);
    // 보류 케이스의 판정은 시작할 때 난다 — 그 구간은 건너뛰어 돌려 봐야 달라질 것이 없다
    const results = cases.map((c, i): CaseResult | undefined =>
      c.held === undefined ? undefined : { tcId: c.tcId, status: 'NA', durationMs: 0, steps: steps[i]!, error: { message: c.held } },
    );
    // 케이스 한도는 그 프로젝트의 테스트 한도 그대로다 — 다시 걸면 바뀌므로 먼저 읽어 둔다
    const 한도 = testInfo.timeout;
    const proc: ProcScope = {
      cases,
      at: 첫,
      열림: true,
      시작: 본문시작,
      steps,
      results,
      안낸: results.flatMap((r, i) => (r === undefined ? [] : [i])),
      낸다,
      ...(받은 !== undefined && { 받은 }),
      한도,
      // Playwright 의 한도는 「지금부터」가 아니라 테스트 시작부터 합친 값이라 지난 시간을 더한다. 전체 한도는 걸지 않는다.
      // 본문보다 먼저 도는 고정물의 준비 시간도 같은 시계에 든다 — 느린 고정물을 더하면 그 고정물에 따로 한도를 준다 (도메인/러너 §5.2 「케이스별 한도」)
      한도를건다: () => {
        if (한도 > 0) testInfo.setTimeout(Date.now() - 본문시작 + 한도);
      },
    };
    // 보류 줄을 먼저 낸다 — 케이스가 모두 보류라 통째로 건너뛸 때도, 도중에 러너가 끊을 때도 그 케이스가 못 간 케이스로 채워지지 않는다
    await 흘린다(proc);
    // 케이스가 모두 보류면 폰 연결을 열지 않고 통째로 건너뛴다
    base.skip(첫 === -1, `${procedure.procId}의 케이스가 모두 보류다`);

    const 게임 = isGame(process.env);
    let side: AppSide | undefined;
    const run: RunScope = {
      seq: 0,
      failed: false,
      stopped: false,
      // 준비 구간 표시 — verify 가 첫 판정에서 켜고 케이스가 바뀔 때 되돌린다
      phase: { started: false, inStep: 0, judged: false },
      proc,
      capture: (seq, 요소) =>
        side === undefined ? Promise.resolve(undefined) : 'driver' in side ? captureApp(side.driver, seq, 요소) : captureGame(side.game, seq),
      // 절차는 그때 차례인 케이스에 붙는다 — 케이스 사이 절차는 다음 케이스 것이고 끝 정리는 마지막으로 돈 케이스 것이다
      emit: (result) => {
        result.tcId = cases[proc.at]!.tcId;
        proc.steps[proc.at]!.push(result);
        return emit(testInfo, result);
      },
      ...(게임 && { elementChecks: [], apiCalls: [] }),
    };
    // 본문 안 마무리는 한도에 걸리면 안 돈다 — 그때는 정리 단계에서 끊긴 케이스와 남은 케이스를 가른다.
    // 사람이 멈췄거나 러너가 끊은 것은 가르지 않는다 — 막은 것이 케이스가 아니다
    appSession.마감을건다(async () => {
      if (testInfo.status !== 'timedOut') return;
      멈춤을가른다(run, proc, 한도초과);
      남은케이스를채운다(proc);
      await 흘린다(proc);
    });
    // 끝 정리 절차는 판정이 난 뒤에 마지막으로 돈 케이스의 절차로 붙는다 — 정리 절차를 더한 판정을 한 번 더 낸다.
    // 앞 줄이 먼저 나가 있어 끝 정리 도중 프로세스가 끊겨도 그 케이스의 판정은 남는다 (도메인/러너 §5.2 「같은 케이스의 판정 줄이 다시 오면 뒤 것을 쓴다」)
    appSession.끝정리를건다(async () => {
      const 앞 = proc.steps[proc.at]!.length;
      await 끝정리(run);
      if (proc.steps[proc.at]!.length === 앞 || proc.results[proc.at] === undefined) return;
      proc.안낸.push(proc.at);
      await 흘린다(proc);
    });

    let 던진것: unknown;
    try {
      await runScope.run(run, async () => {
        // 폰 연결과 앱 켜기가 프로시저에 한 번이다. 로그인할 계정 칸은 첫 케이스에 있다 — 그 케이스가 보류면 값을 못 만들어 그냥 켠다 (K22)
        const intent = 보류인가(cases[0]!) ? undefined : await 실어켤값(procedure, resolveInputs(cases[0]!, 입력값(받은, cases[0]!.tcId)).params);
        const 연것 = await appSession.open(PC항목인가(디바이스) ? { pc: true } : { keepData: keepsAppData(procedure), ...(intent && { intent }) });
        side = 연것;
        // Android 앱 항목도 지난 화면 파일 함수를 적는다 — 옛 꼴 케이스와 같다 (test.ts)
        if (!게임 && 'driver' in 연것) 앱함수를적게건다(연것.driver);
        if (게임 || 'driver' in 연것) run.맵함수 = true;

        await body(
          bodyArgs(
            procedure.procId,
            request,
            undefined,
            연것,
            인증목록(process.env.PLATFORM_API_AUTHS),
            판읽기(process.env.PLATFORM_API_DOC_FILE),
            request,
            어드민키(process.env.PLATFORM_ADMIN_KEY),
          ),
        );
        // test.case 를 빼먹은 채 끝나면 그 케이스가 판정 없이 초록으로 남는다 (K20)
        if (proc.열림) throw new Error(`${cases[proc.at]!.tcId}: test.case 를 부르지 않고 본문이 끝났다`);
      });
    } catch (thrown) {
      // 흐름이 다 끝난 뒤에 온 멈춤 신호는 마지막 케이스 뒤에 둔 절차나 한 번 더 부른 test.case 다 — 붙을 케이스가 없어 판정에는 못 남기지만 초록으로 넘기지 않는다 (K20).
      // 뒤에 보류 케이스가 남았으면 그 케이스의 준비 절차라 그냥 넘긴다
      const 끝난뒤 = thrown instanceof StopTest && !proc.열림 && !cases.some((c, i) => i > proc.at && 보류인가(c));
      멈춤을가른다(run, proc, thrown);
      던진것 = 끝난뒤 ? new Error(`${procedure.procId}: 마지막 케이스 뒤에 절차를 두었거나 test.case 를 다시 불렀다 — 그 뒤는 돌지 않았다. 끝 정리는 test.cleanup 으로 쓴다`) : thrown;
    }
    남은케이스를채운다(proc);
    await 흘린다(proc);

    // 멈춤 신호는 여기서 끝낸다. 진짜 예외는 Playwright 가 위치까지 보여 주도록 그대로 올린다
    if (던진것 !== undefined && !(던진것 instanceof StopTest)) throw 던진것;
    if (proc.results.some((r, i) => r?.status !== 'PASS' && !보류인가(cases[i]!))) throw new Error(`검증 실패: ${run.firstFailure ?? procedure.procId}`);
  });
}
