import type { APIRequestContext, Locator, Page } from '@playwright/test';

export async function 아이디쓰이나(api: APIRequestContext, loginId: string): Promise<boolean> {
  const 응답 = await api.get(`/api/auth/check-id?loginId=${encodeURIComponent(loginId)}`);
  const 본문 = (await 응답.json()) as { available: boolean };
  return !본문.available;
}

export async function 나타났나(칸: Locator, 밀리초 = 3000): Promise<boolean> {
  return 칸.waitFor({ state: 'visible', timeout: 밀리초 }).then(
    () => true,
    () => false,
  );
}

export function 최신순인가(메타글들: string[]): boolean {
  const 값들 = 메타글들.map((글) => {
    const 날짜 = /(\d{4}-\d{2}-\d{2})/.exec(글)?.[1];
    const 시각 = /(\d{2}:\d{2})/.exec(글)?.[1] ?? '00:00';
    return 날짜 === undefined ? `9999-12-31 ${시각}` : `${날짜} 00:00`;
  });
  return 값들.every((값, 번째) => 번째 === 0 || (값들[번째 - 1] ?? '') >= 값);
}

export async function 설정응답받기(page: Page): Promise<{ noticePopup: boolean }> {
  const 응답 = await page.goto('/api/settings');
  if (응답 === null) throw new Error('설정 응답을 받지 못했다');
  return (await 응답.json()) as { noticePopup: boolean };
}

export async function 브라우저시각(page: Page): Promise<string> {
  return page.evaluate(() => new Date().toTimeString().slice(0, 8));
}

export async function 가짜응답으로온상태(page: Page, 주소: string): Promise<number> {
  return page.evaluate(async (경로) => (await fetch(경로, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 주소);
}
