import type { Locator, Page } from '@playwright/test';

export class 사람들목록화면 {
  readonly page: Page;
  readonly 제목: Locator;
  readonly 카드들: Locator;

  constructor(page: Page) {
    this.page = page;
    const 본문 = page.getByRole('main');
    this.제목 = 본문.getByRole('heading', { name: '코디세이 사람들', level: 1 });
    this.카드들 = 본문.getByRole('listitem').filter({ has: page.getByRole('img') });
  }

  async 연다(): Promise<void> {
    await this.page.goto('/board/promotion/list');
  }

  async 첫카드를누른다(): Promise<void> {
    await this.카드들.first().click();
  }
}
