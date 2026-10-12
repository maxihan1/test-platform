import type { Locator, Page } from '@playwright/test';

export class 토스트 {
  readonly 상자: Locator;
  readonly 알림들: Locator;

  constructor(readonly page: Page) {
    this.상자 = page.locator('#toast-box');
    this.알림들 = this.상자.locator('.toast');
  }

  글(문구: string): Locator {
    return this.알림들.filter({ hasText: 문구 });
  }
}
