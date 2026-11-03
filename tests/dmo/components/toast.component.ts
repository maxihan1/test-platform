import type { Locator, Page } from '@playwright/test';

export class 토스트 {
  readonly 상자: Locator;
  readonly 목록: Locator;

  constructor(readonly page: Page) {
    this.상자 = page.locator('#toast-box');
    this.목록 = this.상자.locator('.toast');
  }

  글자(text: string | RegExp): Locator {
    return this.목록.filter({ hasText: text });
  }
}
