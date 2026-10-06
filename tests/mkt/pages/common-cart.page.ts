import type { Locator, Page } from '@playwright/test';

export class 장바구니화면 {
  readonly 제목: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '장바구니', level: 1 });
  }

  async 열기(): Promise<void> {
    await this.page.goto('/cart');
  }
}
