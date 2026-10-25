import type { Page } from '@playwright/test';

export interface 막을창 {
  쿠키?: boolean;
  공지?: boolean;
  설문?: boolean;
}

export async function 안내창막기(page: Page, 막을것: 막을창 = {}): Promise<void> {
  const 설정 = { 쿠키: 막을것.쿠키 ?? true, 공지: 막을것.공지 ?? true, 설문: 막을것.설문 ?? true };
  await page.addInitScript((값) => {
    const 지금 = new Date();
    const 두자리 = (n: number): string => String(n).padStart(2, '0');
    const 오늘 = `${지금.getFullYear()}-${두자리(지금.getMonth() + 1)}-${두자리(지금.getDate())}`;
    if (값.쿠키) localStorage.setItem('dm_cookie_ok', '1');
    if (값.공지) localStorage.setItem('dm_notice_hide', 오늘);
    if (값.설문) sessionStorage.setItem('dm_survey_done', '1');
  }, 설정);
}
