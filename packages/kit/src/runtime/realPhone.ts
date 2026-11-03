// 실제 폰 Chrome — 모바일 웹 케이스를 VISION 이 켜 준 폰 Chrome 의 창 하나 · 탭 하나에 붙여 돌린다 (SPEC 도메인/러너 §5.2 「모바일 웹 — 실제 폰 Chrome」)
// 러너 고정 spec 도 같은 연결을 한다(apps/runner/scenario/realPhone.ts) — 고정 spec 은 kit 을 값으로 못 불러 옮겨 적었다. 거기 검사가 글자가 같은지 지킨다

import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

import { test as base, type APIRequestContext, type Browser, type BrowserContext, type BrowserType, type Page } from '@playwright/test';

import type { DeviceInfo } from '../types.js';
import { DEVICE_ATTACHMENT, 창하나글 } from './protocol.js';

const 글 = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/** 토큰은 머리글로만 싣는다 — 주소에 넣으면 VISION 기록에 남는다. 늦추기는 launchOptions 가 안 먹어 연결 옵션으로 준다 */
export async function 폰Chrome에붙는다(chromium: BrowserType, env: Record<string, string | undefined>): Promise<Browser> {
  const 토큰 = env.PLATFORM_APPIUM_TOKEN;
  const slowMo = Number(env.PLATFORM_SLOW_MO);
  const browser = await chromium.connectOverCDP(env.PLATFORM_CDP_URL ?? '', {
    ...(토큰 ? { headers: { Authorization: `Bearer ${토큰}` } } : {}),
    ...(slowMo > 0 ? { slowMo } : {}),
  });
  browser.newContext = () => Promise.reject(new Error(창하나글));
  return browser;
}

// 모델 · Android 판은 러너가 VISION 기기 목록에서 채운다 — 여기서는 붙은 Chrome 의 판만 안다
export const Chrome기기 = (browser: Browser): DeviceInfo => ({ model: null, osVersion: null, appVersion: null, browser: browser.version() || null });

const API = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'fetch']);
const 풀기 = (기준: string, 주소: unknown): unknown => {
  if (typeof 주소 !== 'string') return 주소;
  try {
    return new URL(주소, 기준).toString();
  } catch {
    return 주소;
  }
};

/**
 * 폰 Chrome 의 기본 창은 Playwright 가 만든 창이 아니라 baseURL 이 없다 — page.goto('/login') · page.request.get('/api/…') 가 못 간다.
 * 주소 맞추기(waitForURL · toHaveURL · route 무늬)가 읽는 클라이언트 쪽 칸은 채우고, goto · request 는 감싸 푼다.
 * 그 칸은 내부 칸이라 Playwright 판을 올릴 때 깨질 수 있다 — 러너 시나리오의 기준바꾸기(apps/runner/scenario/browser.ts)와 같은 칸이다
 */
export function 주소를푼다(context: BrowserContext, page: Page, 기준: string | undefined): Page {
  if (!기준) return page;
  const 칸 = (context as unknown as { _options?: { baseURL?: string } })._options;
  if (칸 !== undefined) 칸.baseURL = 기준;
  const 원래 = context.request;
  const 요청 = new Proxy(원래, {
    get(t, prop) {
      const v: unknown = Reflect.get(t, prop, t);
      if (typeof v !== 'function') return v;
      const f = (v as (...a: unknown[]) => unknown).bind(t);
      return typeof prop === 'string' && API.has(prop) ? (주소: unknown, ...rest: unknown[]) => f(풀기(기준, 주소), ...rest) : f;
    },
  });
  (context as { request: APIRequestContext }).request = 요청;
  return new Proxy(page, {
    get(t, prop) {
      // 탭의 request 는 탭을 만들 때 굳는다 — 폰 Chrome 이 켜 둔 탭이라 창의 것으로 돌려준다
      if (prop === 'request') return 요청;
      if (prop === 'goto') return (주소: string, options?: Parameters<Page['goto']>[1]) => t.goto(풀기(기준, 주소) as string, options);
      const v: unknown = Reflect.get(t, prop, t);
      return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(t) : v;
    },
  });
}

/** 통과 못 한 정식 실행 항목의 폰 화면 영상 — 러너가 경로를 준 실행만 찍고, 통과면 러너가 지운다. 못 찍어도 케이스는 그대로 돈다 */
export async function 영상을찍는다(page: Page, 경로: string | undefined): Promise<() => Promise<void>> {
  if (!경로) return async () => {};
  try {
    await mkdir(dirname(경로), { recursive: true });
    await page.screencast.start({ path: 경로 });
  } catch (err) {
    console.warn(`[kit] 폰 화면 영상을 못 걸었다: ${글(err)}`);
    return async () => {};
  }
  return () => page.screencast.stop().catch((err: unknown) => console.warn(`[kit] 폰 화면 영상을 못 마쳤다: ${글(err)}`));
}

// 케이스 단독 실행의 창 · 탭을 폰 Chrome 의 것으로 바꾼다. 프로젝트 use 의 화면 크기 · 사용자 에이전트는 안 건다 — 폰 값 그대로다
export function 실제폰테스트() {
  return base.extend({
    browser: [
      async ({ playwright }, use) => {
        const browser = await 폰Chrome에붙는다(playwright.chromium, process.env);
        // 붙은 뒤로는 토큰을 안 쓴다 — 케이스 코드가 환경값으로 못 읽게 지운다
        delete process.env.PLATFORM_APPIUM_TOKEN;
        await use(browser);
        // 연결만 끊는다. Chrome 데이터는 VISION 이 폰을 놓을 때 지운다
        await browser.close().catch((err: unknown) => console.warn(`[kit] 폰 Chrome 연결을 못 끊었다: ${글(err)}`));
      },
      { scope: 'worker', timeout: 0 },
    ],
    context: async ({ browser }, use) => {
      const context = browser.contexts()[0];
      if (context === undefined) throw new Error('폰 Chrome 에 열린 창이 없다 — VISION 이 Chrome 을 켰는지 본다');
      await use(context);
    },
    page: async ({ browser, context, baseURL }, use, testInfo) => {
      const page = context.pages()[0] ?? (await context.newPage());
      // 리포터가 결과 줄 device 로 싣는다 (도메인/리포팅 §8.4)
      await testInfo.attach(DEVICE_ATTACHMENT, { body: JSON.stringify(Chrome기기(browser)), contentType: 'application/json' });
      const 영상끝 = await 영상을찍는다(page, process.env.PLATFORM_PHONE_VIDEO);
      await use(주소를푼다(context, page, baseURL));
      await 영상끝();
    },
  });
}
