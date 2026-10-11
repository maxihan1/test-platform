import type { Locator, Page } from '@playwright/test';

export class 가입완료화면 {
  static readonly 주소 = '/signup/done';

  readonly page: Page;
  readonly 환영문구: Locator;
  readonly 로그인하러가기: Locator;

  constructor(page: Page) {
    this.page = page;
    this.환영문구 = page.getByRole('heading', { level: 1 });
    this.로그인하러가기 = page.getByRole('link', { name: '로그인하러 가기' });
  }
}
