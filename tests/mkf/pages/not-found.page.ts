import type { Locator, Page } from '@playwright/test';

export class 없는화면 {
  static readonly 주소 = '/no-such-page';

  readonly 제목: Locator;
  readonly 홈으로: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { level: 1 });
    this.홈으로 = page.getByRole('main').getByRole('link', { name: '홈으로' });
  }

  async 열기(): Promise<void> {
    await this.page.goto(없는화면.주소);
  }
}
