// 3회 실행에서 화면이 부르는 API 응답을 늦춰 기다림이 빠진 케이스를 병합 전에 드러낸다 (SPEC 도메인/작성 §3.6 「느린 망」)

import type { Page, Route } from '@playwright/test';

const 최소ms = 100;
const 최대ms = 1500;

// 문서 · 그림 · 글꼴까지 늦추면 화면 열기만 느려진다. 케이스가 놓치는 기다림은 화면이 부른 API 응답이다.
// 케이스가 page.context().route() 로 건 모킹은 이것보다 나중에 걸려 먼저 받으므로 안 늦춰진다 — 모킹 응답은 늘 바로 온다
export async function 늦추기(route: Route, 뽑기: () => number = Math.random): Promise<void> {
  const 종류 = route.request().resourceType();
  if (종류 === 'fetch' || 종류 === 'xhr') {
    await new Promise((끝) => setTimeout(끝, 최소ms + 뽑기() * (최대ms - 최소ms)));
  }
  await route.fallback();
}

// 브라우저 쪽에서 늦추므로 데모가 아닌 회사 서버에서도 된다. 실행 화면의 실행은 이 값을 안 넘겨 그대로다
// 창 묶음(context)에 건다 — 케이스가 새 탭을 열어도 늦춰진다. 본문보다 먼저 걸어 케이스의 모킹이 먼저 받는다.
// 케이스가 browser.newContext() 로 따로 만든 창 묶음은 안 늦춘다. 가로채기를 켜면 브라우저 캐시가 꺼진다 — 3회 실행에서만 켜는 까닭이다
export async function 느린망(page: Page): Promise<void> {
  if (process.env.PLATFORM_SLOW_API !== '1') return;
  await page.context().route('**/*', (route) => 늦추기(route));
}
