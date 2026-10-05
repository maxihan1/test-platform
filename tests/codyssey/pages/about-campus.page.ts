import type { Locator, Page } from '@playwright/test';

export class 캠퍼스안내화면 {
  readonly page: Page;
  readonly 제목: Locator;

  constructor(page: Page) {
    this.page = page;
    this.제목 = page.getByRole('main').getByRole('heading', { name: '캠퍼스 안내', level: 1, exact: true });
  }

  소제목(이름: string): Locator {
    return this.page.getByRole('main').getByRole('heading', { name: 이름, exact: true });
  }

  async 연다(): Promise<void> {
    await this.page.goto('/about/campus');
  }
}
