import type { Locator, Page } from '@playwright/test';

export class 맨위로버튼 {
  constructor(private readonly page: Page) {}

  get 버튼(): Locator {
    return this.page.getByRole('button', { name: '맨 위로' });
  }
}
