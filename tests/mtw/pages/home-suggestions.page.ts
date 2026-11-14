import type { Locator, Page } from '@playwright/test';

export class 팔로우추천카드 {
  readonly 카드: Locator;

  constructor(page: Page) {
    this.카드 = page.getByText('팔로우할 만한 사람', { exact: true });
  }
}
