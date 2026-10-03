import type { Locator, Page } from '@playwright/test';

import { 머리글부품 } from '../components/header.component.js';

export class 전체메뉴패널 {
  readonly 알림신청버튼: Locator;
  readonly 인재유형테스트버튼: Locator;
  readonly 숨겨진AI찾기버튼: Locator;
  private readonly 머리글: 머리글부품;

  constructor(private readonly page: Page) {
    this.머리글 = new 머리글부품(page);
    this.알림신청버튼 = page.getByRole('button', { name: '교육과정 알림신청', exact: true });
    this.인재유형테스트버튼 = page.getByRole('button', { name: 'AI 인재 유형 테스트', exact: true });
    this.숨겨진AI찾기버튼 = page.getByRole('button', { name: '나의 숨겨진 AI DNA 찾기', exact: true });
  }

  async 열기(): Promise<void> {
    await this.머리글.전체메뉴버튼.click();
  }

  async 화면안에_보이는가(버튼: Locator): Promise<boolean> {
    const 핸들 = await 버튼.elementHandle({ timeout: 10000 }).catch(() => null);
    if (핸들 === null) return false;
    return this.page
      .waitForFunction(
        (요소) => {
          const 상자 = 요소.getBoundingClientRect();
          return getComputedStyle(요소).visibility === 'visible' && 상자.width > 0 && 상자.left >= 0 && 상자.right <= window.innerWidth;
        },
        핸들,
        { timeout: 10000 },
      )
      .then(() => true, () => false);
  }
}
