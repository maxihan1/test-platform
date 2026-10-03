import type { Locator, Page } from '@playwright/test';

export class 토스트 {
  constructor(private readonly page: Page) {}

  get 상자(): Locator {
    return this.page.locator('#toast-box');
  }

  get 전체(): Locator {
    return this.page.locator('#toast-box .toast');
  }

  문구(글자: string): Locator {
    return this.page.locator('#toast-box .toast', { hasText: 글자 });
  }
}
