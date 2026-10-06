import type { Locator, Page } from '@playwright/test';

export class 게시판로그인화면 {
  readonly 제목: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '로그인', level: 1 });
  }

  async 경로읽기(): Promise<string> {
    return new URL(this.page.url()).pathname;
  }
}
