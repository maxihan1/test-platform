import type { Locator, Page } from '@playwright/test';

export class 공개정보화면 {
  static readonly 주소 = '/about';

  readonly 서버규칙: Locator;

  constructor(private readonly page: Page) {
    this.서버규칙 = page.getByRole('button', { name: '서버 규칙' });
  }

  async 열기(): Promise<void> {
    await this.page.goto(공개정보화면.주소);
    await this.서버규칙.waitFor();
  }

  규칙문구(글: string): Locator {
    return this.page.getByRole('listitem').filter({ hasText: 글 });
  }

  async 서버규칙펼치기(): Promise<void> {
    await this.서버규칙.click();
  }
}
