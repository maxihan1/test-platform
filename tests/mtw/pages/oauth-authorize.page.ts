import type { Page } from '@playwright/test';

export class 앱승인화면 {
  static readonly 주소 = '/oauth/authorize';

  constructor(private readonly page: Page) {}

  async 열기(): Promise<void> {
    await this.page.goto(앱승인화면.주소);
  }
}
