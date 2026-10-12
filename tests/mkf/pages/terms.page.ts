import type { Locator, Page } from '@playwright/test';

export class 이용약관화면 {
  static readonly 주소 = '/terms';

  readonly 제목: Locator;
  readonly 첫제목: Locator;
  readonly 본문: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { name: '이용약관', level: 1 });
    this.첫제목 = page.getByRole('main').getByRole('heading', { level: 1 });
    this.본문 = page.getByRole('main').getByRole('article');
  }

  async 열기(): Promise<void> {
    await this.page.goto(이용약관화면.주소);
  }
}
