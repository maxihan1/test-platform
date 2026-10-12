import type { Locator, Page } from '@playwright/test';

export class 안내화면 {
  readonly 제목: Locator;
  readonly 문구: Locator;
  readonly 홈으로: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { level: 1 });
    this.문구 = page.getByRole('main').locator('p').first();
    this.홈으로 = page.getByRole('main').getByRole('link', { name: '홈으로' });
  }

  제목글(글: string): Locator {
    return this.page.getByRole('main').getByRole('heading', { name: 글, level: 1 });
  }
}
