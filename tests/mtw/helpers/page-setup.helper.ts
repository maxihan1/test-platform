import type { BrowserContext, Page, Route } from '@playwright/test';

const 한국어머리 = { 'Accept-Language': 'ko-KR,ko;q=0.9' };
const 건창 = new WeakSet<BrowserContext>();

export async function 한국어로(page: Page): Promise<void> {
  const 창묶음 = page.context();
  if (건창.has(창묶음)) return;
  건창.add(창묶음);
  await 창묶음.route('**/*', (route) =>
    route.fallback({ headers: { ...route.request().headers(), 'accept-language': 한국어머리['Accept-Language'] } }),
  );
}

export interface 새창 {
  창묶음: BrowserContext;
  page: Page;
}

export async function 새창열기(page: Page, 설정: { 자바스크립트?: boolean } = {}): Promise<새창> {
  const 브라우저 = page.context().browser();
  if (브라우저 === null) throw new Error('새 창을 열 브라우저가 없다');
  const 창묶음 = await 브라우저.newContext({ locale: 'ko-KR', extraHTTPHeaders: 한국어머리, javaScriptEnabled: 설정.자바스크립트 ?? true });
  const 새page = await 창묶음.newPage();
  await 한국어로(새page);
  return { 창묶음, page: 새page };
}

export function 표식(이름: string): string {
  return `tc${이름}${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}

export async function 한국어머리다시걸기(page: Page): Promise<() => Promise<void>> {
  const 처리 = (route: Route): Promise<void> =>
    route.fallback({ headers: { ...route.request().headers(), 'accept-language': 한국어머리['Accept-Language'] } });
  await page.context().route('**/*', 처리);
  return () => page.context().unroute('**/*', 처리);
}
