import type { Locator, Page } from '@playwright/test';

export class 이용약관화면 {
  static readonly 주소 = '/terms';
  readonly 제목: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '이용약관', level: 1, exact: true });
  }
}

export class 개인정보처리방침화면 {
  static readonly 주소 = '/privacy';
  readonly 제목: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '개인정보처리방침', level: 1, exact: true });
  }
}
