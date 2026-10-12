import type { Page, Route } from '@playwright/test';

const 목록주소 = /\/api\/posts(\?.*)?$/;

export async function 게시글목록실패모킹(page: Page): Promise<() => Promise<void>> {
  const 처리 = async (route: Route): Promise<void> => {
    await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ code: 'INTERNAL' }) });
  };
  await page.context().route(목록주소, 처리);
  return async () => {
    await page.context().unroute(목록주소, 처리);
  };
}

export async function 목록응답이실패로오나(page: Page): Promise<boolean> {
  await page.goto('/');
  return (await page.evaluate(async () => (await fetch('/api/posts?size=1')).status)) === 500;
}

export async function 가짜클립보드걸렸나(page: Page): Promise<boolean> {
  return await page.evaluate(() => Object.prototype.hasOwnProperty.call(window, '__가짜클립보드'));
}
