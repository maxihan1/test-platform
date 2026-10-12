import type { Locator, Page } from '@playwright/test';

export class 약관화면 {
  static readonly 주소 = '/terms';

  readonly 제목: Locator;
  readonly 제1조: Locator;

  constructor(readonly page: Page) {
    const 본문 = page.getByRole('main');
    this.제목 = 본문.getByRole('heading', { name: '이용약관', level: 1 });
    this.제1조 = 본문.getByRole('article').getByText('제1조 (목적)');
  }

  async 열기(): Promise<void> {
    await this.page.goto(약관화면.주소);
  }
}
