import type { Locator, Page } from '@playwright/test';

export class 토스트 {
  readonly 상자: Locator;
  readonly 모두: Locator;

  constructor(page: Page) {
    this.상자 = page.locator('#toast-box');
    this.모두 = this.상자.locator('.toast');
  }

  글(문구: string): Locator {
    return this.모두.filter({ hasText: 문구 });
  }
}
