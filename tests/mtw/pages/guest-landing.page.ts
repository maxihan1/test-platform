import type { Locator, Page } from '@playwright/test';

export class 로그인전화면 {
  static readonly 주소 = '/explore';

  readonly 계정생성: Locator;
  readonly 로그인: Locator;

  constructor(private readonly page: Page) {
    this.계정생성 = page.getByRole('link', { name: '계정 생성' });
    this.로그인 = page.getByRole('link', { name: '로그인', exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto(로그인전화면.주소);
    await this.계정생성.waitFor();
  }
}
