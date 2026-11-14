import type { Locator, Page } from '@playwright/test';

export class 알림막대 {
  readonly 모두: Locator;

  constructor(page: Page) {
    this.모두 = page.getByRole('status');
  }

  글(문구: string | RegExp): Locator {
    return this.모두.filter({ hasText: 문구 });
  }

  동작(문구: string | RegExp, 이름: string): Locator {
    return this.글(문구).getByText(이름, { exact: true });
  }
}
