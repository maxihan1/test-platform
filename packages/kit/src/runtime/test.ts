// Playwright의 test를 감싼 래퍼. 케이스 명세와 주입된 입력값을 본문에 넘기고 절차 결과를 리포터로 흘린다 (SPEC §4)

import {
  test as base,
  type APIRequestContext,
  type APIResponse,
  type Page,
  type TestInfo,
} from '@playwright/test';

import type { StepResult } from '../types.js';
import { shotPath } from './artifacts.js';
import { runScope, type RunScope } from './context.js';
import type { CaseHandle } from './defineCase.js';
import { recordHttpTrace } from './http.js';
import { injectedInputs, resolveInputs } from './inputs.js';
import { STEP_ATTACHMENT } from './protocol.js';
import { step, StopTest } from './step.js';

export interface CaseBodyArgs<P, E> {
  page: Page;
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

async function emit(testInfo: TestInfo, result: StepResult): Promise<void> {
  await testInfo.attach(STEP_ATTACHMENT, {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
}

function defineTest<P, E>(spec: CaseHandle<P, E>, body: CaseBody<P, E>): void {
  // 스캐너는 명세만 읽으려고 이 파일을 import 한다. 그때는 Playwright에 등록하지 않는다 (SPEC §3.1)
  if (process.env.PLATFORM_SCAN === '1') return;

  base(spec.name, async ({ page, request }, testInfo) => {
    // 선언하지 않은 환경에서 돌면 케이스의 전제가 깨진다. 판정 대신 건너뛴다
    base.skip(
      !spec.platforms.some((p) => p === testInfo.project.name),
      `${spec.tcId}은 ${testInfo.project.name} 환경을 선언하지 않았다`,
    );

    const { params, expected } = resolveInputs(spec, injectedInputs());

    const run: RunScope = {
      seq: 0,
      failed: false,
      stopped: false,
      capture: (seq) => capture(page, seq),
      emit: (result) => emit(testInfo, result),
    };

    await runScope.run(run, async () => {
      try {
        await body({ page, request: traced(request), params, expected });
      } catch (thrown) {
        // 멈춤 신호는 여기서 끝낸다. 진짜 예외는 Playwright가 위치까지 보여주도록 그대로 올린다
        if (!(thrown instanceof StopTest)) throw thrown;
      }
    });

    if (run.failed) throw new Error(`검증 실패: ${run.firstFailure ?? spec.tcId}`);
  });
}

export const test = Object.assign(defineTest, { step });
