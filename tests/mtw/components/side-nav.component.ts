import type { Locator, Page } from '@playwright/test';

export class 오른쪽메뉴 {
  readonly 영역: Locator;
  readonly 로고: Locator;
  readonly 더보기: Locator;

  constructor(page: Page) {
    this.영역 = page.getByRole('navigation', { name: '메인' });
    this.로고 = this.영역.getByRole('link', { name: 'Mastodon' });
    this.더보기 = this.영역.getByRole('button', { name: '더 보기' });
  }

  링크(이름: string | RegExp): Locator {
    return this.영역.getByRole('link', { name: 이름 });
  }

  async 그려질때까지(): Promise<void> {
    await this.영역.waitFor();
  }
}
