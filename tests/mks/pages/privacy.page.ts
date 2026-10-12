import type { Locator, Page } from '@playwright/test';

export class 개인정보처리방침화면 {
  static readonly 주소 = '/privacy';

  readonly 제목: Locator;
  readonly 제1조: Locator;

  constructor(readonly page: Page) {
    const 본문 = page.getByRole('main');
    this.제목 = 본문.getByRole('heading', { name: '개인정보처리방침', level: 1 });
    this.제1조 = 본문.getByRole('article').getByText('제1조 (수집하는 개인정보 항목)');
  }

  async 열기(): Promise<void> {
    await this.page.goto(개인정보처리방침화면.주소);
  }
}
