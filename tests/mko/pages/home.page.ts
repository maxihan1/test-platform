import type { Locator, Page } from '@playwright/test';

export class 홈화면 {
  static readonly 주소 = '/';

  readonly 머리글: Locator;

  constructor(readonly page: Page) {
    this.머리글 = page.getByRole('heading', { name: '데모마켓 홈', level: 1 });
  }
}
