import type { Locator, Page } from '@playwright/test';

export class 알림 {
  readonly 모두: Locator;

  constructor(page: Page) {
    this.모두 = page.locator('.flash-message');
  }

  글(문구: string): Locator {
    return this.모두.filter({ hasText: 문구 });
  }
}
