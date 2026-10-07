// Playwright의 test를 감싼 래퍼. 케이스 명세와 주입된 입력값을 본문에 넘기고 절차 결과를 리포터로 흘린다 (SPEC §4)

import {
  test as base,
  type APIRequestContext,
  type APIResponse,
  type Page,
  type TestInfo,
} from '@playwright/test';

import type { StepResult } from '../types.js';
import { captureApp, openApp, type AppDriver } from './app.js';
import { shotPath } from './artifacts.js';
import { runScope, type RunScope } from './context.js';
import type { CaseHandle } from './defineCase.js';
import { recordHttpTrace } from './http.js';
import { injectedInputs, resolveInputs } from './inputs.js';
import { STEP_ATTACHMENT } from './protocol.js';
import { registerScenarioCase, type ScenarioCaseRunner } from './scenario.js';
import { step, StopTest } from './step.js';

// 브라우저 케이스에는 page, android 앱 케이스에는 driver 만 있다. 없는 쪽을 꺼내면 던진다
export interface CaseBodyArgs<P, E> {
  page: Page;
  driver: AppDriver;
  request: APIRequestContext;
  params: P;
  expected: E;
}

export type CaseBody<P, E> = (args: CaseBodyArgs<P, E>) => Promise<void> | void;

const TRACED_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'fetch']);
const TRACE_BODY_LIMIT = 2000;

type ApiCall = (url: string, options?: Record<string, unknown>) => Promise<APIResponse>;

async function traceResponse(
  method: string,
  url: string,
  options: Record<string, unknown> | undefined,
  response: APIResponse,
): Promise<void> {
  let body: string;
  try {
    body = (await response.text()).slice(0, TRACE_BODY_LIMIT);
  } catch (err) {
    body = `본문을 읽지 못했다: ${err instanceof Error ? err.message : String(err)}`;
  }
  recordHttpTrace(
    { method: method.toUpperCase(), url, data: options?.data },
    { status: response.status(), body },
  );
}

// API 케이스는 화면이 없다. 대신 요청·응답 원문을 절차에 남긴다 (SPEC §4)
function traced(request: APIRequestContext): APIRequestContext {
  return new Proxy(request, {
    get(target, prop, receiver) {
      const original: unknown = Reflect.get(target, prop, receiver);
      if (typeof prop !== 'string' || !TRACED_METHODS.has(prop) || typeof original !== 'function') {
        return original;
      }
      const call = (original as ApiCall).bind(target);
      return async (url: string, options?: Record<string, unknown>): Promise<APIResponse> => {
        const response = await call(url, options);
        await traceResponse(prop, url, options, response);
        return response;
      };
    },
  });
}

async function capture(page: Page, seq: number): Promise<string | undefined> {
  // 화면을 연 적이 없는 케이스는 찍어봐야 흰 그림만 남는다
  if (page.isClosed() || page.url() === 'about:blank') return undefined;
  try {
    const { absolute, recorded } = await shotPath(seq);
    await page.screenshot({ path: absolute });
    return recorded;
  } catch (err) {
    // 스크린샷이 실패해도 판정은 남겨야 한다. 대신 왜 없는지는 알린다
    console.error(`[kit] ${seq}번 절차 스크린샷 실패: ${err instanceof Error ? err.message : String(err)}`);
    return undefined;
  }
}

// desktop·mobile은 코드 안에서만 쓰는 값이다. 사람이 읽는 자리에는 PC·모바일로 적는다 (SPEC §8)
function platformLabel(project: string): string {
  if (project === 'desktop') return 'PC';
  if (project === 'mobile') return '모바일';
  if (project === 'android') return 'Android 앱';
  return project;
}

function browserArgs<P, E>(
  tcId: string,
  page: Page,
  request: APIRequestContext,
  params: P,
  expected: E,
): CaseBodyArgs<P, E> {
  return {
    page,
    get driver(): AppDriver {
      throw new Error(`${tcId}은 브라우저 케이스라 driver 가 없다`);
    },
    request,
    params,
    expected,
  };
}

function appArgs<P, E>(
  tcId: string,
  driver: AppDriver,
  request: APIRequestContext,
  params: P,
  expected: E,
): CaseBodyArgs<P, E> {
  return {
    get page(): Page {
      throw new Error(`${tcId}은 Android 앱 케이스라 page 가 없다 — driver 를 쓴다`);
    },
    driver,
    request,
    params,
    expected,
  };
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
  return async ({ page, request, platform, params, expected, skipSteps, seq, phase }) => {
    const steps: StepResult[] = [];
    const run: RunScope = {
      seq,
      failed: false,
      stopped: false,
      skip: new Set(skipSteps),
      phase,
      capture: (s) => capture(page, s),
      emit: async (result) => {
        steps.push(result);
      },
    };

    let error: { message: string; stack?: string } | undefined;
    try {
      // 조립할 때 서버가 막지만, 조립 뒤에 케이스가 디바이스를 뺄 수 있다. 틀린 조립은 언제나 빨강이다 (2026-09-28 사용자)
      if (!spec.platforms.some((p) => p === platform)) {
        throw new Error(`${spec.tcId}은 ${platformLabel(platform)} 환경을 선언하지 않았다`);
      }
      const inputs = resolveInputs(spec, { params, expected });
      await runScope.run(run, async () => {
        try {
          await body(browserArgs(spec.tcId, page, traced(request), inputs.params, inputs.expected));
        } catch (thrown) {
          if (!(thrown instanceof StopTest)) throw thrown;
        }
      });
    } catch (thrown) {
      // 던지면 이미 모은 절차가 사라진다. 여기서 잡아 부품의 실패와 사유로 돌려준다
      error = errorOf(thrown);
    }

    return { seq: run.seq, steps, failed: run.failed || error !== undefined, ...(error === undefined ? {} : { error }) };
  };
}

function defineTest<P, E>(spec: CaseHandle<P, E>, body: CaseBody<P, E>): void {
  // 스캐너는 명세만 읽으려고 이 파일을 import 한다. 그때는 Playwright에 등록하지 않는다 (SPEC §3.1)
  if (process.env.PLATFORM_SCAN === '1') return;

  // 러너 고정 spec 이 조립 목록대로 불러 쓴다. 그때도 Playwright 에 등록하지 않는다 (SPEC 공통/3-공유계약 §5.1)
  if (process.env.PLATFORM_SCENARIO_MODE === '1') {
    registerScenarioCase(spec.tcId, scenarioRunner(spec, body));
    return;
  }

  const isApp = spec.platforms.includes('android');

  // 케이스를 건너뛸지는 본문에서 가른다. fixture 는 그보다 먼저 돌아서 거기서 열면 보류 케이스도 Appium 에 붙는다
  const appTest = isApp
    ? base.extend<{ appSession: { open(): Promise<AppDriver> } }>({
        appSession: async ({}, use) => {
          let driver: AppDriver | undefined;
          await use({ open: async () => (driver ??= await openApp(process.env)) });
          if (driver === undefined) return;
          // 본문 안 finally 는 제한 시간에 걸리면 안 돈다. 정리 단계는 그 뒤에도 돈다
          try {
            await driver.deleteSession();
          } catch (err) {
            // 닫기 실패로 이미 난 판정을 덮으면 안 된다. 대신 폰에 세션이 남았을 수 있다는 것은 알린다
            console.error(`[kit] Appium 연결을 닫지 못했다: ${err instanceof Error ? err.message : String(err)}`);
          }
        },
      })
    : undefined;

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
    args: (inputs: { params: P; expected: E }) => CaseBodyArgs<P, E>,
    captureStep: RunScope['capture'],
    inputs: { params: P; expected: E },
  ): Promise<void> => {
    const run: RunScope = {
      seq: 0,
      failed: false,
      stopped: false,
      capture: captureStep,
      emit: (result) => emit(testInfo, result),
    };

    await runScope.run(run, async () => {
      try {
        await body(args(inputs));
      } catch (thrown) {
        // 멈춤 신호는 여기서 끝낸다. 진짜 예외는 Playwright가 위치까지 보여주도록 그대로 올린다
        if (!(thrown instanceof StopTest)) throw thrown;
      }
    });

    if (run.failed) throw new Error(`검증 실패: ${run.firstFailure ?? spec.tcId}`);
  };

  if (appTest) {
    appTest(spec.name, async ({ request, appSession }, testInfo) => {
      const inputs = prepare(testInfo);
      const driver = await appSession.open();
      await execute(testInfo, (i) => appArgs(spec.tcId, driver, traced(request), i.params, i.expected), (seq) => captureApp(driver, seq), inputs);
    });
    return;
  }

  base(spec.name, async ({ page, request }, testInfo) => {
    const inputs = prepare(testInfo);
    await execute(testInfo, (i) => browserArgs(spec.tcId, page, traced(request), i.params, i.expected), (seq) => capture(page, seq), inputs);
  });
}

export const test = Object.assign(defineTest, { step });
