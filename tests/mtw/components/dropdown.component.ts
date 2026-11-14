import type { Locator, Page } from '@playwright/test';

export class 펼침메뉴 {
  readonly 상자: Locator;

  constructor(page: Page) {
    this.상자 = page.locator('.dropdown-menu');
  }

  항목(이름: string | RegExp): Locator {
    return this.상자.getByRole('button', { name: 이름 }).or(this.상자.getByRole('link', { name: 이름 }));
  }

  async 열릴때까지(): Promise<void> {
    await this.상자.first().waitFor();
  }

  async 닫힐때까지(): Promise<void> {
    await this.상자.first().waitFor({ state: 'detached' });
  }
}
