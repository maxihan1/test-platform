import type { Locator, Page } from '@playwright/test';

export class 이용약관화면 {
  readonly page: Page;
  readonly 제목: Locator;
  readonly 제1장: Locator;
  readonly 제1조: Locator;

  constructor(page: Page) {
    this.page = page;
    this.제목 = page.getByRole('main').getByRole('heading', { name: '이용약관', level: 1, exact: true });
    this.제1장 = page.getByRole('main').getByText(/^제1장/);
    this.제1조 = page.getByRole('main').getByText(/^제1조/);
  }

  async 연다(): Promise<void> {
    await this.page.goto('/terms/service');
  }
}
