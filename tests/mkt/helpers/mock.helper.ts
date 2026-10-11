import type { BrowserContext, Route } from '@playwright/test';

export async function 오류응답걸기(context: BrowserContext, 패턴: RegExp, 상태: number, 본문: object): Promise<() => Promise<void>> {
  const 처리 = async (route: Route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({ status: 상태, contentType: 'application/json', body: JSON.stringify(본문) });
  };
  await context.route(패턴, 처리);
  return () => context.unroute(패턴, 처리);
}
