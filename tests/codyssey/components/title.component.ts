import type { Locator, Page } from '@playwright/test';

export class 제목 {
  constructor(private readonly page: Page) {}

  대제목(이름: string): Locator {
    return this.page.getByRole('heading', { level: 1, name: 이름, exact: true });
  }

  중제목(이름: string): Locator {
    return this.page.getByRole('heading', { level: 2, name: 이름, exact: true });
  }

  소제목(이름: string): Locator {
    return this.page.getByRole('heading', { level: 3, name: 이름, exact: true });
  }
}
