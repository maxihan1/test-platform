import type { Locator, Page } from '@playwright/test';

export class 운영툴화면 {
  static readonly 주소 = '/ops';

  readonly 권한없음머리글: Locator;
  readonly 홈으로: Locator;

  constructor(readonly page: Page) {
    this.권한없음머리글 = page.getByRole('heading', { name: '권한이 없습니다', level: 1 });
    this.홈으로 = page.getByRole('link', { name: '홈으로' });
  }

  async 열기(): Promise<void> {
    await this.page.goto(운영툴화면.주소);
  }
}
