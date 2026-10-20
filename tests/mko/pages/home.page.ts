import type { Locator, Page } from '@playwright/test';

export class 홈화면 {
  static readonly 주소 = '/';

  readonly 제목: Locator;

  constructor(page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { level: 1 });
  }

  async 그려질때까지(): Promise<void> {
    await this.제목.waitFor();
  }
}
