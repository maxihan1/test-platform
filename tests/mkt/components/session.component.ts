import type { BrowserContext, Page } from '@playwright/test';

export async function 안내창끄기(page: Page, 무엇: { 쿠키?: boolean; 공지?: boolean; 설문?: boolean } = {}): Promise<void> {
  const 고른것 = { 쿠키: 무엇.쿠키 ?? true, 공지: 무엇.공지 ?? true, 설문: 무엇.설문 ?? true };
  await page.addInitScript((끌것) => {
    const 두자리 = (n: number) => String(n).padStart(2, '0');
    const 지금 = new Date();
    const 오늘 = `${지금.getFullYear()}-${두자리(지금.getMonth() + 1)}-${두자리(지금.getDate())}`;
    try {
      if (끌것.쿠키) localStorage.setItem('dm_cookie_ok', '1');
      if (끌것.공지) localStorage.setItem('dm_notice_hide', 오늘);
      if (끌것.설문) sessionStorage.setItem('dm_survey_done', '1');
    } catch {
      return;
    }
  }, 고른것);
}

export function 기준주소(page: Page): string {
  return new URL(page.url()).origin;
}

export async function 새브라우저(page: Page): Promise<BrowserContext> {
  const 브라우저 = page.context().browser();
  if (!브라우저) throw new Error('브라우저를 찾지 못했다');
  return 브라우저.newContext({ baseURL: 기준주소(page) });
}

export async function 브라우저다시열기(page: Page): Promise<Page> {
  const 남길쿠키 = (await page.context().cookies()).filter((c) => c.expires > 0);
  const 새것 = await 새브라우저(page);
  if (남길쿠키.length > 0) await 새것.addCookies(남길쿠키);
  await page.context().close();
  return 새것.newPage();
}
