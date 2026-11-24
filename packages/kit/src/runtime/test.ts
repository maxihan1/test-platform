// Playwright의 test를 감싼 래퍼. 케이스 명세와 주입된 입력값을 본문에 넘기고 절차 결과를 리포터로 흘린다 (SPEC §4)

import { test as base, type APIRequestContext, type Page, type TestInfo } from '@playwright/test';

import { PC항목인가, type ProcedureSpec, type StepResult } from '../types.js';
import { 어드민키, 인증목록 } from './apiAuth.js';
import { 판읽기 } from './apiShape.js';
import { captureApp } from './app.js';
import { 앱테스트 } from './appFixture.js';
import { saveShot } from './artifacts.js';
import { bodyArgs, emit, platformLabel, type CaseBody, type ProcedureBody, type Side } from './bodyArgs.js';
import { runScope, type RunScope, type 짚을요소 } from './context.js';
import { keepsAppData, 선언했나, 실어켤값, type CaseHandle } from './defineCase.js';
import { captureGame, 게임증적을남긴다, isGame } from './game.js';
import { 앱함수를적게건다 } from './gameFns.js';
import { cleanup, 게임시나리오인가, 끝정리 } from './gameScenario.js';
import { 웹사진 } from './highlight.js';
import { injectedInputs, resolveInputs } from './inputs.js';
import { 장면걸기 } from './live.js';
import { testCase, 프로시저를등록한다 } from './procedure.js';
import { 프로시저를시나리오에올린다 } from './procedureScenario.js';
import { GAME_ATTACHMENT, STEP_ATTACHMENT } from './protocol.js';
import { 실제폰테스트 } from './realPhone.js';
import { registerScenarioCase, registerScenarioPhone, type ScenarioCaseRunner } from './scenario.js';
import { 느린망 } from './slowApi.js';
import { step, StopTest } from './step.js';

async function capture(page: Page, seq: number, 요소?: 짚을요소): Promise<string | undefined> {
  // 화면을 연 적이 없는 케이스는 찍어봐야 흰 그림만 남는다
  if (page.isClosed() || page.url() === 'about:blank') return undefined;
  return saveShot(seq, (path) => 웹사진(page, path, typeof 요소 === 'object' && !('웹' in 요소) ? 요소 : undefined));
}

function errorOf(thrown: unknown): { message: string; stack?: string } {
  const err = thrown instanceof Error ? thrown : new Error(String(thrown));
  return { message: err.message, ...(err.stack === undefined ? {} : { stack: err.stack }) };
}

// E2E 시나리오의 부품 하나. 이 kit 인스턴스의 문맥으로 본체를 감싸야 본체 안 step() 이 문맥을 찾는다.
// 부를 때마다 실패 표시·건너뛸 제목·결과 모으기를 새로 세운다 — 앞 부품의 것이 새면 안 된다 (SPEC 공통/3-공유계약 §5.1)
function scenarioRunner<P, E>(spec: CaseHandle<P, E>, body: CaseBody<P, E>): ScenarioCaseRunner {
  return async ({ page, driver, game, adminKey, request, platform, params, expected, skipSteps, seq, phase, apiAuths, apiDoc, tokenRequest }) => {
    const steps: StepResult[] = [];
    // 앱 · 게임 단계는 폰 화면을 찍는다. 러너가 둘 중 하나는 꼭 싣는다 (도메인/시나리오 §3.7 결정 16)
    const side: Side | undefined = page !== undefined ? { page } : driver !== undefined ? { driver, ...(game && { game }) } : undefined;
    const run: RunScope = {
      seq,
      failed: false,
      stopped: false,
      skip: new Set(skipSteps),
      phase,
      capture: (s, 요소) => (side === undefined || !('page' in side || 'driver' in side) ? Promise.resolve(undefined) : 'page' in side ? capture(side.page, s, 요소) : captureApp(side.driver, s, 요소)),
      emit: async (result) => {
        steps.push(result);
        // trace 를 단계로 가르는 경계다. 한 zip 에 부품이 다 섞여 이것 없이는 admin 이 실패 부품 몫을 못 뗀다 (도메인/시나리오 §7 「실패 기록」)
        if (process.env.PLATFORM_TRACE === '1') await emit(base.info(), result);
      },
    };

    // 부품이 시작하는 경계 — 앞 순번을 단다. 그 전의 일(API 부품 호출 · 앞 부품의 늦은 오류)이 이 부품 첫 단계로 섞이지 않게
    if (process.env.PLATFORM_TRACE === '1') {
      await base.info().attach(STEP_ATTACHMENT, { body: JSON.stringify({ seq }), contentType: 'application/json' });
    }

    // 앞 게임 단계의 오류가 이 단계 실패 기록에 섞이지 않게 시작 자리를 받아 둔다. 못 받으면 처음부터 남긴다.
    // 앞 단계가 game.restart() 로 모아 둔 앞 게임 오류도 그 단계 몫이라 여기서 비운다
    game?.다시켜기전오류를꺼낸다();
    const 오류시작 = game === undefined ? 0 : await game.errors().then((r) => r.last, () => 0);
    let error: { message: string; stack?: string } | undefined;
    try {
      // 조립할 때 서버가 막지만, 조립 뒤에 케이스가 디바이스를 뺄 수 있다. 틀린 조립은 언제나 빨강이다 (2026-09-28 사용자)
      if (!선언했나(spec.platforms, platform)) {
        throw new Error(`${spec.tcId}은 ${platformLabel(platform)} 환경을 선언하지 않았다`);
      }
      if (side === undefined) throw new Error(`${spec.tcId}에 줄 창도 폰 연결도 없다`);
      const inputs = resolveInputs(spec, { params, expected });
      await runScope.run(run, async () => {
        try {
          // 부품마다 그 부품 애플리케이션의 인증으로 새로 받고 그 부품 판과 견준다 — 앞 부품의 토큰 · 판이 다음 부품에 새지 않게
          await body(bodyArgs(spec.tcId, request, inputs, side, apiAuths ?? [], apiDoc, tokenRequest, adminKey));
        } catch (thrown) {
          if (!(thrown instanceof StopTest)) throw thrown;
        }
      });
    } catch (thrown) {
      // 던지면 이미 모은 절차가 사라진다. 여기서 잡아 부품의 실패와 사유로 돌려준다
      error = errorOf(thrown);
    }

    const failed = run.failed || error !== undefined;
    // 실패한 게임 단계 — 그 순간 오브젝트 목록 · 게임 오류 기록을 시나리오 폴더에 둔다. 단독 항목은 정리 단계(appFixture)가 하는 일이다 (도메인/시나리오 §3.7 결정 16 「결과」)
    if (failed && game !== undefined) {
      await 게임증적을남긴다(game, process.env.PLATFORM_RUN_ID ?? '0', process.env.PLATFORM_HISTORY_ID ?? '0', 오류시작);
    }
    await 끝정리(run);
    // 단계 사이에 앱을 다시 켜지 않는다 — 이 단계가 눌러 둔 손가락(touchDown)이 다음 단계까지 남지 않게 거둔다. 실패 순간이 남게 증적 뒤에
    await game?.입력을거둔다();
    return { seq: run.seq, steps, failed, ...(error === undefined ? {} : { error }) };
  };
}

function defineTest<P, E>(spec: CaseHandle<P, E>, body: CaseBody<P, E>): void;
function defineTest(procedure: ProcedureSpec, body: ProcedureBody): void;
function defineTest<P, E>(target: CaseHandle<P, E> | ProcedureSpec, body: CaseBody<P, E> | ProcedureBody): void {
  // 스캐너는 명세만 읽으려고 이 파일을 import 한다. 그때는 Playwright에 등록하지 않는다 (SPEC §3.1)
  if (process.env.PLATFORM_SCAN === '1') return;

  // 안 케이스에도 procId 가 실려 있어 cases 로 가른다. E2E 시나리오 모드는 러너 고정 spec 이 꺼내 쓴다 (도메인/시나리오 §3.7 결정 17)
  if ('cases' in target) {
    if (process.env.PLATFORM_SCENARIO_MODE === '1') 프로시저를시나리오에올린다(target, body as ProcedureBody);
    else 프로시저를등록한다(target, body as ProcedureBody);
  } else 케이스를등록한다(target, body as CaseBody<P, E>);
}

function 케이스를등록한다<P, E>(spec: CaseHandle<P, E>, body: CaseBody<P, E>): void {
  // 러너 고정 spec 이 조립 목록대로 불러 쓴다. 그때도 Playwright 에 등록하지 않는다 (SPEC 공통/3-공유계약 §5.1)
  if (process.env.PLATFORM_SCENARIO_MODE === '1') {
    registerScenarioCase(spec.tcId, scenarioRunner(spec, body));
    if (spec.platforms.includes('android')) registerScenarioPhone();
    return;
  }

  // 윈도우 PC 항목도 브라우저 없이 같은 fixture 로 돈다 — 폰과 PC 는 그 항목의 프로젝트 이름으로 가른다 (appFixture.ts).
  // 버튼 그림 케이스는 패드 값만 적는다 — windows 하나만 보면 브라우저 길로 빠진다 (도메인/게임 §3.10 결정 27)
  const isApp = spec.platforms.some((p) => p === 'android' || PC항목인가(p));

  // 케이스를 건너뛸지는 본문에서 가른다. fixture 는 그보다 먼저 돌아서 거기서 열면 보류 케이스도 Appium 에 붙는다
  const appTest = isApp ? 앱테스트() : undefined;
  // 러너가 VISION 폰 Chrome 주소를 준 모바일 항목은 그 폰 Chrome 의 창 · 탭으로 돈다 (SPEC 도메인/러너 §5.2 「모바일 웹 — 실제 폰 Chrome」)
  const webTest = process.env.PLATFORM_CDP_URL ? 실제폰테스트() : base;

  const prepare = (testInfo: TestInfo) => {
    // 게임 시나리오는 전체 한도가 없다 — 한 번의 기다림과 미션 멈춤만 잡는다 (도메인/게임 §3.10 결정 21)
    if (게임시나리오인가(spec.tcId)) testInfo.setTimeout(0);
    // 보류 케이스는 사람이 채울 칸에 기본값이 없어 입력 검증부터 깨진다. 채워 held 를 지우면 그대로 돈다
    base.skip(spec.held !== undefined, spec.held);

    // 선언하지 않은 환경에서 돌면 케이스의 전제가 깨진다. 판정 대신 건너뛴다
    base.skip(
      !선언했나(spec.platforms, testInfo.project.name),
      `${spec.tcId}은 ${platformLabel(testInfo.project.name)} 환경을 선언하지 않았다`,
    );

    return resolveInputs(spec, injectedInputs());
  };

  const execute = async (
    testInfo: TestInfo,
    request: APIRequestContext,
    side: Side,
    captureStep: RunScope['capture'],
    inputs: { params: P; expected: E },
    // 앱은 연결 정리 단계가 증적 뒤에 끝 정리를 돌린다 — 본문 안 finally 는 제한 시간에 걸리면 안 돈다
    끝정리를건다?: (끝: () => Promise<void>) => void,
  ): Promise<void> => {
    const 게임 = isGame(process.env);
    // Android 앱 항목도 지난 화면 파일 함수를 적는다 — 정식 실행이 앱 조작 맵 줄을 이 이름으로 맞춘다 (도메인/작성 §3.6 「★ 앱 탐색」 결정 10)
    const 앱 = !게임 && 'driver' in side;
    if (앱) 앱함수를적게건다(side.driver);
    const run: RunScope = {
      seq: 0,
      failed: false,
      stopped: false,
      capture: captureStep,
      emit: (result) => emit(testInfo, result),
      ...(게임 && { elementChecks: [], apiCalls: [] }),
      ...((게임 || 앱) && { 맵함수: true as const }),
    };
    끝정리를건다?.(() => 끝정리(run));

    try {
      await runScope.run(run, async () => {
        try {
          await body(
            bodyArgs(
              spec.tcId,
              request,
              inputs,
              side,
              인증목록(process.env.PLATFORM_API_AUTHS),
              판읽기(process.env.PLATFORM_API_DOC_FILE),
              request,
              어드민키(process.env.PLATFORM_ADMIN_KEY),
            ),
          );
        } catch (thrown) {
          // 멈춤 신호는 여기서 끝낸다. 진짜 예외는 Playwright가 위치까지 보여주도록 그대로 올린다
          if (!(thrown instanceof StopTest)) throw thrown;
        }
      });
    } finally {
      // 예외로 끝나도 그때까지 대조한 값 · 부른 API 는 사실이다 — 리포터가 결과 줄에 싣는다
      // 남기기가 실패해도 케이스의 진짜 예외를 덮지 않는다
      if (게임) {
        await testInfo
          .attach(GAME_ATTACHMENT, { body: JSON.stringify({ elementChecks: run.elementChecks, apiCalls: run.apiCalls }), contentType: 'application/json' })
          .catch((err: unknown) => console.error(`[kit] 게임 기록을 남기지 못했다: ${err instanceof Error ? err.message : String(err)}`));
      }
      // ponytail: 웹은 정리 단계가 없어 본문 끝에서 돈다 — 제한 시간에 걸리면 안 돌고 다음 테스트의 시작 정리가 줍는다
      if (끝정리를건다 === undefined) await 끝정리(run);
    }

    if (run.failed) throw new Error(`검증 실패: ${run.firstFailure ?? spec.tcId}`);
  };

  if (appTest) {
    appTest(spec.name, async ({ request, appSession }, testInfo) => {
      const inputs = prepare(testInfo);
      const intent = await 실어켤값(spec, inputs.params);
      // 게임 시나리오는 싸우는 동안 게임 명령만 보내 Appium 명령이 오래 없다 — 연결 유지 한도를 끈다
      // 윈도우 PC 항목은 Appium 설정이 쓰이지 않는다 — VISION 에 게임을 켜고 붙는다
      const side = await appSession.open(
        PC항목인가(testInfo.project.name)
          ? { pc: true }
          : { keepData: keepsAppData(spec), ...(intent && { intent }), ...(게임시나리오인가(spec.tcId) && { noCommandTimeout: true }) },
      );
      const 찍기: RunScope['capture'] = 'driver' in side ? (seq, 요소) => captureApp(side.driver, seq, 요소) : (seq) => captureGame(side.game, seq);
      await execute(testInfo, request, side, 찍기, inputs, appSession.끝정리를건다);
    });
    return;
  }

  webTest(spec.name, async ({ page, request }, testInfo) => {
    // 테스트 모드는 동작마다 쉬니 시험 한도를 다섯 배로 늘린다 — 안 늘리면 동작이 많은 케이스가 테스트 모드에서만 시간 초과로 빨개진다 (SPEC 도메인/러너 §5.2 「테스트 모드」)
    if (Number(process.env.PLATFORM_SLOW_MO) > 0) testInfo.setTimeout(testInfo.timeout * 5);
    const inputs = prepare(testInfo);
    // 실제 폰 Chrome 은 고정물(realPhone.ts)이 영상과 같이 건다 — 탭마다 하나라 여기서 또 걸면 겹친다
    if (!process.env.PLATFORM_CDP_URL) await 장면걸기(page);
    await 느린망(page);
    await execute(testInfo, request, { page }, (seq, 요소) => capture(page, seq, 요소), inputs);
  });
}

export const test = Object.assign(defineTest, { step, cleanup, case: testCase });
