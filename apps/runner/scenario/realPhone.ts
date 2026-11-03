// 실제 폰 Chrome 에 붙는다 — 모바일 시나리오의 웹 단계가 VISION 이 켜 준 폰 Chrome 의 창 하나 · 탭 하나로 끝까지 돈다 (SPEC 도메인/러너 §5.2 「모바일 웹 — 실제 폰 Chrome」)
// kit runtime/realPhone.ts 의 폰Chrome에붙는다와 같은 일이다. 고정 spec 은 kit 을 값으로 못 불러(wire.ts 머리) 옮겨 적었다 —
// 실패 글은 wire.test.ts 가, 연결(토큰 머리글 · 창 막기)은 real-phone.test.ts 가 케이스 단독 · 시나리오 둘 다 실측으로 지킨다

import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

import type { Browser, BrowserContext, BrowserType, Page } from '@playwright/test';

import { 기준바꾸기 } from './browser.js';
import { 남김 } from './parts.js';

export const 창하나글 = '실제 폰 Chrome 은 창을 하나만 쓴다 — 케이스가 창을 새로 만들었다(browser.newContext)';

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

export interface 폰창 {
  context: BrowserContext;
  탭: Page;
  닫기(): Promise<void>;
}

/**
 * 폰 Chrome 의 기본 창 · 탭(VISION 이 about:blank 로 켜 둔 것)을 시나리오 창으로 쓴다. 흉내는 안 걸고 폰 값 그대로다.
 * 기본 창에는 baseURL 이 없어 주소 맞추기의 기준만 시작 주소로 채운다 — goto 상대 주소는 단계감시가, request 는 감싼 도구가 푼다.
 * 시작 애플리케이션 단계도 goto 를 풀어야 해서 window.ts 가 단계감시에 늘 기준을 준다. 기본 창은 못 닫아 닫을 때 탭을 닫는다 — 한도에 걸린 단계가 아직 쥔 탭을 멈추는 길이 이것뿐이다.
 * Chrome 데이터는 VISION 이 폰을 놓을 때 지운다.
 * 영상 경로가 오면(통과 못 한 정식 실행에 남길 것) 그 탭을 찍는다. 못 찍어도 시나리오는 그대로 돈다
 */
export async function 폰창을연다(browser: Browser, baseUrl: string, 영상경로: string): Promise<폰창> {
  const context = browser.contexts()[0];
  if (context === undefined) throw new Error('폰 Chrome 에 열린 창이 없다 — VISION 이 Chrome 을 켰는지 본다');
  기준바꾸기(context, baseUrl);
  const 탭 = context.pages()[0] ?? (await context.newPage());
  // ponytail: 첫 탭이 닫혀 새 탭으로 바뀌면 영상은 거기서 끊긴다 — 탭이 바뀌는 시나리오가 잦으면 새 탭에 이어 찍는다
  const 찍음 = 영상경로 !== '' && (await mkdir(dirname(영상경로), { recursive: true }).then(() => 탭.screencast.start({ path: 영상경로 })).then(() => true, (err: unknown) => 남김('폰 화면 영상을 못 걸었다')(err) ?? false));
  return {
    context,
    탭,
    async 닫기() {
      if (찍음 && !탭.isClosed()) await 탭.screencast.stop().catch(남김('폰 화면 영상을 못 마쳤다'));
      for (const p of context.pages()) await p.close().catch(남김('폰 Chrome 탭을 못 닫았다'));
    },
  };
}
