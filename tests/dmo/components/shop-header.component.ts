import type { Locator, Page } from '@playwright/test';

export class 쇼핑몰머리줄 {
  readonly 종: Locator;
  readonly 종건수: Locator;
  readonly 종목록: Locator;
  readonly 안읽은알림: Locator;

  constructor(readonly page: Page) {
    this.종 = page.getByRole('button', { name: '알림', exact: true });
    this.종건수 = page.locator('.bell-count');
    this.종목록 = page.locator('.bell-list');
    this.안읽은알림 = this.종목록.locator('.unread');
  }

  알림(message: string): Locator {
    return this.종목록.getByText(message, { exact: true });
  }

  async 종열기(): Promise<void> {
    await this.종.click();
    await this.종목록.waitFor();
  }
}
