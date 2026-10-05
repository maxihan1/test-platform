import type { Locator, Page } from '@playwright/test';

export class 가입완료화면 {
  readonly 환영문구: Locator;
  readonly 로그인하러가기버튼: Locator;

  constructor(page: Page) {
    this.환영문구 = page.getByRole('heading', { level: 1 });
    this.로그인하러가기버튼 = page.getByRole('link', { name: '로그인하러 가기', exact: true });
  }

  async 열림기다리기(): Promise<void> {
    await this.환영문구.filter({ hasText: '님, ' }).waitFor();
  }
}
