import type { Page } from '@playwright/test';

export async function 방해창막기(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const 두자리 = (n: number) => String(n).padStart(2, '0');
    const 오늘 = new Date();
    try {
      localStorage.setItem('dm_notice_hide', `${오늘.getFullYear()}-${두자리(오늘.getMonth() + 1)}-${두자리(오늘.getDate())}`);
      localStorage.setItem('dm_cookie_ok', '1');
      sessionStorage.setItem('dm_survey_done', '1');
    } catch {
      return;
    }
  });
}

export async function 공지와쿠키만막기(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const 두자리 = (n: number) => String(n).padStart(2, '0');
    const 오늘 = new Date();
    try {
      localStorage.setItem('dm_notice_hide', `${오늘.getFullYear()}-${두자리(오늘.getMonth() + 1)}-${두자리(오늘.getDate())}`);
      localStorage.setItem('dm_cookie_ok', '1');
    } catch {
      return;
    }
  });
}

export async function 쿠키띠와설문만막기(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('dm_cookie_ok', '1');
      sessionStorage.setItem('dm_survey_done', '1');
    } catch {
      return;
    }
  });
}

export function 좁은화면인가(page: Page): boolean {
  return (page.viewportSize()?.width ?? 1280) < 768;
}

export async function 공지와설문만막기(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const 두자리 = (n: number) => String(n).padStart(2, '0');
    const 오늘 = new Date();
    try {
      localStorage.setItem('dm_notice_hide', `${오늘.getFullYear()}-${두자리(오늘.getMonth() + 1)}-${두자리(오늘.getDate())}`);
      sessionStorage.setItem('dm_survey_done', '1');
    } catch {
      return;
    }
  });
}
