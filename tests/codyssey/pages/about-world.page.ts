import type { Locator, Page } from '@playwright/test';

export class 세계관화면 {
  readonly page: Page;
  readonly 제목: Locator;

  constructor(page: Page) {
    this.page = page;
    this.제목 = page.getByRole('main').getByRole('heading', { name: '코디세이 세계관', level: 1, exact: true });
  }

  가치(이름: string): Locator {
    return this.page.getByRole('main').getByText(이름, { exact: true });
  }

  async 연다(): Promise<void> {
    await this.page.goto('/about/world');
  }
}
