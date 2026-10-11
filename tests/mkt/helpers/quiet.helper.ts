import type { Page } from '@playwright/test';

export async function 방해막기(page: Page, 막을것: { 쿠키띠?: boolean; 공지팝업?: boolean; 설문?: boolean } = {}): Promise<void> {
  const 고른것 = { 쿠키띠: 막을것.쿠키띠 ?? true, 공지팝업: 막을것.공지팝업 ?? true, 설문: 막을것.설문 ?? true };
  await page.addInitScript((g) => {
    const d = new Date();
    const 오늘 = `${String(d.getFullYear())}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (g.쿠키띠) localStorage.setItem('dm_cookie_ok', '1');
    if (g.공지팝업) localStorage.setItem('dm_notice_hide', 오늘);
    if (g.설문) sessionStorage.setItem('dm_survey_done', '1');
  }, 고른것);
}
