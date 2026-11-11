import type { Locator, Page } from '@playwright/test';

export class 이메일뉴스레터화면 {
  static readonly 주소 = '/admin/email_subscriptions';

  readonly 제목: Locator;
  readonly 시작하기: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '이메일 뉴스레터', level: 1 });
    this.시작하기 = page.getByRole('link', { name: '시작하기' });
  }

  async 열기(): Promise<void> {
    await this.page.goto(이메일뉴스레터화면.주소);
    await this.제목.waitFor();
  }
}
