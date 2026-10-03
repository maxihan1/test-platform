import type { Locator, Page } from '@playwright/test';

export class 쿠키띠 {
  constructor(private readonly page: Page) {}

  get 영역(): Locator {
    return this.page.getByRole('region', { name: '쿠키 안내' });
  }

  get 동의(): Locator {
    return this.영역.getByRole('button', { name: '동의' });
  }
}
