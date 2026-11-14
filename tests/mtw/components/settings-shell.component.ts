import type { Locator, Page } from '@playwright/test';

export class 설정틀 {
  readonly 왼쪽메뉴: Locator;
  readonly 성공안내: Locator;
  readonly 오류안내: Locator;
  readonly 오류요약: Locator;
  readonly 저장: Locator;

  constructor(page: Page) {
    this.왼쪽메뉴 = page.locator('.sidebar nav');
    this.성공안내 = page.locator('.flash-message.notice');
    this.오류안내 = page.locator('.flash-message.alert');
    this.오류요약 = page.locator('.flash-message').filter({ hasText: '오류가 발생했습니다' });
    this.저장 = page.getByRole('button', { name: '변경 사항을 저장' }).first();
  }

  메뉴(이름: string | RegExp): Locator {
    return this.왼쪽메뉴.getByRole('link', { name: 이름 });
  }
}
