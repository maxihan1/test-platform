import type { Locator, Page } from '@playwright/test';

export class 개인정보처리방침화면 {
  readonly page: Page;
  readonly 제목: Locator;
  readonly 표들: Locator;

  constructor(page: Page) {
    this.page = page;
    this.제목 = page.getByRole('main').getByRole('heading', { name: '개인정보처리방침', level: 1, exact: true });
    this.표들 = page.getByRole('main').getByRole('table');
  }

  async 연다(): Promise<void> {
    await this.page.goto('/terms/privacy');
  }
}
