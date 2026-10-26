import type { BrowserContext, Page, Request } from '@playwright/test';

export function 좁은화면인가(page: Page): boolean {
  return (page.viewportSize()?.width ?? 1280) < 768;
}

export function 날짜글(날: Date): string {
  const 두자리 = (n: number): string => String(n).padStart(2, '0');
  return `${날.getFullYear()}-${두자리(날.getMonth() + 1)}-${두자리(날.getDate())}`;
}

export function 오늘부터(일수: number): string {
  const 날 = new Date();
  날.setDate(날.getDate() + 일수);
  return 날짜글(날);
}

export function 요일(날짜: string): number {
  const [y, m, d] = 날짜.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

export function 글자(길이: number, 바탕 = '가나다라마바사아자차'): string {
  return 바탕.repeat(Math.ceil(길이 / 바탕.length)).slice(0, 길이);
}

export async function 두프레임기다리기(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>((끝) => requestAnimationFrame(() => requestAnimationFrame(() => 끝()))));
}

export async function 보낸요청끝날때까지(page: Page, 작업: () => Promise<void>, 거름: (주소: string) => boolean = (주소) => 주소.includes('/api/')): Promise<Request[]> {
  const 보낸: Request[] = [];
  const 들음 = (요청: Request): void => {
    if (거름(요청.url())) 보낸.push(요청);
  };
  page.on('request', 들음);
  try {
    await 작업();
    await 두프레임기다리기(page);
  } finally {
    page.off('request', 들음);
  }
  await Promise.all(보낸.map((요청) => 요청.response()));
  return 보낸;
}

export async function 새창묶음(page: Page): Promise<BrowserContext> {
  const 브라우저 = page.context().browser();
  if (브라우저 === null) throw new Error('브라우저를 찾지 못해 새 창 묶음을 만들 수 없다');
  return 브라우저.newContext();
}
