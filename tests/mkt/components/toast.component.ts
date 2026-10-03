import type { Locator, Page } from '@playwright/test';

export class 토스트 {
  constructor(private readonly page: Page) {}

  영역(): Locator {
    return this.page.getByRole('status');
  }

  문구(내용: string): Locator {
    return this.영역().getByText(내용, { exact: true });
  }
}
