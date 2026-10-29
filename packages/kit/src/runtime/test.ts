// Playwright의 test를 감싼 래퍼. 케이스 명세와 주입된 입력값을 본문에 넘기고 절차 결과를 리포터로 흘린다 (SPEC §4)

import { test as base, type APIRequestContext, type Locator, type Page, type TestInfo } from '@playwright/test';

import type { ApiAuth, StepResult } from '../types.js';
import { api만들기, 어드민도구, 어드민키, 인증목록 } from './apiAuth.js';
import { 판읽기 } from './apiShape.js';
import { captureApp, type AppDriver } from './app.js';
import { 앱테스트 } from './appFixture.js';
import { saveShot } from './artifacts.js';
import { runScope, type RunScope } from './context.js';
import type { CaseHandle } from './defineCase.js';
import { 게임증적을남긴다, isGame, type GameDriver } from './game.js';
import { 앱을지켜본다, 웹사진, 웹을지켜본다 } from './highlight.js';
import { traced } from './http.js';
import { injectedInputs, resolveInputs } from './inputs.js';
import { GAME_ATTACHMENT, STEP_ATTACHMENT } from './protocol.js';
import { registerScenarioCase, registerScenarioPhone, type ScenarioCaseRunner } from './scenario.js';
import { 느린망 } from './slowApi.js';
import { step, StopTest } from './step.js';

// 브라우저 케이스에는 page, android 앱 케이스에는 driver 만 있다. game 은 게임 애플리케이션 항목에만, admin 은 대상 서버 줄에 어드민 키가 있을 때만. 없는 쪽을 꺼내면 던진다
export interface CaseBodyArgs<P, E> {
  page: Page;
  driver: AppDriver;
  game: GameDriver;
  // 대상 서버 줄의 어드민 키를 머리로 붙인 요청 도구 — 게임 케이스의 준비 · 서버 값 읽기 (도메인/게임 §3.10 「케이스 꼴」)
  admin: APIRequestContext;
  request: APIRequestContext;
  // 그 이름 API 인증의 토큰을 붙인 요청 도구. request 는 「인증 없이」다 (도메인/API §3.8 「API 인증」)
  api: (name: string) => APIRequestContext;
  params: P;
  expected: E;
}

export type CaseBody<P, E> = (args: CaseBodyArgs<P, E>) => Promise<void> | void;


async function capture(page: Page, seq: number, 요소?: Locator | string): Promise<string | undefined> {
  // 화면을 연 적이 없는 케이스는 찍어봐야 흰 그림만 남는다
  if (page.isClosed() || page.url() === 'about:blank') return undefined;
  return saveShot(seq, (path) => 웹사진(page, path, typeof 요소 === 'object' ? 요소 : undefined));
}

// desktop·mobile은 코드 안에서만 쓰는 값이다. 사람이 읽는 자리에는 PC·모바일로 적는다 (SPEC §8)
function platformLabel(project: string): string {
  if (project === 'desktop') return 'PC';
  if (project === 'mobile') return '모바일';
  if (project === 'android') return 'Android 앱';
  return project;
}

type Side = { page: Page } | { driver: AppDriver; game?: GameDriver };
type AdminKey = { header: string; value: string };

// 없는 칸(page / driver / game / admin)은 꺼내면 던진다. 열거되면 `{ ...args }` 나 `({ page, ...rest })` 만 써도 터지므로 숨긴다
function bodyArgs<P, E>(
  tcId: string,
  request: APIRequestContext,
  inputs: { params: P; expected: E },
  side: Side,
  인증들: readonly ApiAuth[],
  문서: unknown,
  토큰도구: APIRequestContext = request,
  키?: AdminKey,
): CaseBodyArgs<P, E> {
  const 없는칸: [string, string][] = [
    'page' in side
      ? ['driver', `${tcId}은 브라우저 케이스라 driver 가 없다`]
      : ['page', `${tcId}은 Android 앱 케이스라 page 가 없다 — driver 를 쓴다`],
  ];
  if (!('game' in side && side.game !== undefined)) {
    없는칸.push(['game', `${tcId}은 게임 애플리케이션 항목이 아니라 game 이 없다`]);
  }
  if (키 === undefined) {
    없는칸.push(['admin', `${tcId}의 대상 서버 줄에 어드민 키가 없어 admin 을 쓸 수 없다 — 설정 › 대상 서버 줄의 어드민 키를 채운다`]);
  }
  // 비밀값은 처음부터, 받은 토큰은 받는 대로 더해진다. 어드민 키 값도 기록 · 오류 글에서 가린다 (공통/3-공유계약 「게임 테스트 타입」 adminKey)
  const 비밀 = new Set([...인증들.map((a) => a.clientSecret), ...(키 === undefined ? [] : [키.value])]);
  // 판 원문이 있으면 request · api(…) 의 모든 응답을 그 판과 견준다 (도메인/API §3.8 「응답 모양 확인」)
  const 감싼 = traced(request, 비밀, 문서);
  const args = {
    request: 감싼,
    api: api만들기(인증들, 감싼, 토큰도구, 비밀),
    ...(키 === undefined ? {} : { admin: 어드민도구(감싼, 키) }),
    params: inputs.params,
    expected: inputs.expected,
    // 케이스가 다룬 요소를 적는 판으로 넘긴다 — 실패 사진에 그 요소를 네모로 짚는다 (highlight.ts)
    ...('page' in side ? { page: 웹을지켜본다(side.page) } : { ...side, driver: 앱을지켜본다(side.driver) }),
  };
  for (const [칸, message] of 없는칸) {
    Object.defineProperty(args, 칸, {
      get(): never {
        throw new Error(message);
      },
      enumerable: false,
    });
  }
  return args as unknown as CaseBodyArgs<P, E>;
}

async function emit(testInfo: TestInfo, result: StepResult): Promise<void> {
  await testInfo.attach(STEP_ATTACHMENT, {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
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
      capture: (s, 요소) => (side === undefined ? Promise.resolve(undefined) : 'page' in side ? capture(side.page, s, 요소) : captureApp(side.driver, s, 요소)),
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

    // 앞 게임 단계의 오류가 이 단계 실패 기록에 섞이지 않게 시작 자리를 받아 둔다. 못 받으면 처음부터 남긴다
    const 오류시작 = game === undefined ? 0 : await game.errors().then((r) => r.last, () => 0);
    let error: { message: string; stack?: string } | undefined;
    try {
      // 조립할 때 서버가 막지만, 조립 뒤에 케이스가 디바이스를 뺄 수 있다. 틀린 조립은 언제나 빨강이다 (2026-09-28 사용자)
      if (!spec.platforms.some((p) => p === platform)) {
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
    return { seq: run.seq, steps, failed, ...(error === undefined ? {} : { error }) };
  };
}

function defineTest<P, E>(spec: CaseHandle<P, E>, body: CaseBody<P, E>): void {
  // 스캐너는 명세만 읽으려고 이 파일을 import 한다. 그때는 Playwright에 등록하지 않는다 (SPEC §3.1)
  if (process.env.PLATFORM_SCAN === '1') return;

  // 러너 고정 spec 이 조립 목록대로 불러 쓴다. 그때도 Playwright 에 등록하지 않는다 (SPEC 공통/3-공유계약 §5.1)
  if (process.env.PLATFORM_SCENARIO_MODE === '1') {
    registerScenarioCase(spec.tcId, scenarioRunner(spec, body));
    if (spec.platforms.includes('android')) registerScenarioPhone();
    return;
  }

  const isApp = spec.platforms.includes('android');

  // 케이스를 건너뛸지는 본문에서 가른다. fixture 는 그보다 먼저 돌아서 거기서 열면 보류 케이스도 Appium 에 붙는다
  const appTest = isApp ? 앱테스트() : undefined;

  const prepare = (testInfo: TestInfo) => {
    // 보류 케이스는 사람이 채울 칸에 기본값이 없어 입력 검증부터 깨진다. 채워 held 를 지우면 그대로 돈다
    base.skip(spec.held !== undefined, spec.held);

    // 선언하지 않은 환경에서 돌면 케이스의 전제가 깨진다. 판정 대신 건너뛴다
    base.skip(
      !spec.platforms.some((p) => p === testInfo.project.name),
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
  ): Promise<void> => {
    const 게임 = isGame(process.env);
    const run: RunScope = {
      seq: 0,
      failed: false,
      stopped: false,
      capture: captureStep,
      emit: (result) => emit(testInfo, result),
      ...(게임 && { elementChecks: [], apiCalls: [] }),
    };

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
    }

    if (run.failed) throw new Error(`검증 실패: ${run.firstFailure ?? spec.tcId}`);
  };

  if (appTest) {
    appTest(spec.name, async ({ request, appSession }, testInfo) => {
      const inputs = prepare(testInfo);
      const side = await appSession.open();
      await execute(testInfo, request, side, (seq, 요소) => captureApp(side.driver, seq, 요소), inputs);
    });
    return;
  }

  base(spec.name, async ({ page, request }, testInfo) => {
    const inputs = prepare(testInfo);
    await 느린망(page);
    await execute(testInfo, request, { page }, (seq, 요소) => capture(page, seq, 요소), inputs);
  });
}

export const test = Object.assign(defineTest, { step });
