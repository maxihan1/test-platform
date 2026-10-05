import type { Locator, Page } from '@playwright/test';

export class 소개화면 {
  readonly page: Page;
  readonly 제목: Locator;

  constructor(page: Page) {
    this.page = page;
    this.제목 = page.getByRole('main').getByRole('heading', { name: '코디세이 소개', level: 1, exact: true });
  }

  소제목(이름: string): Locator {
    return this.page.getByRole('main').getByRole('heading', { name: 이름, exact: true });
  }

  async 연다(): Promise<void> {
    await this.page.goto('/about/intro');
  }
}
