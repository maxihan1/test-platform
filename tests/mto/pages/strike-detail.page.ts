import type { Locator, Page } from '@playwright/test';

export class 처벌상세화면 {
  static readonly 주소 = '/admin/disputes/strikes/';

  readonly 제목: Locator;
  readonly 이의제기승인: Locator;
  readonly 이의제기거절: Locator;

  constructor(page: Page) {
    this.제목 = page.getByRole('heading', { name: /^경고: /, level: 1 });
    this.이의제기승인 = page.getByRole('link', { name: '이의제기 승인' });
    this.이의제기거절 = page.getByRole('link', { name: '이의 제기 거절' });
  }
}
