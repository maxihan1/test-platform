import type { Locator, Page } from '@playwright/test';

export class 머리글 {
  readonly 로그아웃: Locator;

  constructor(page: Page) {
    this.로그아웃 = page.getByRole('banner').getByRole('button', { name: '로그아웃' });
  }

  async 로그인뒤그려질때까지(): Promise<void> {
    await this.로그아웃.waitFor();
  }
}
