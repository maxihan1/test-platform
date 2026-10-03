import type { Locator, Page } from '@playwright/test';

export class 쿠키띠 {
  constructor(private readonly page: Page) {}

  영역(): Locator {
    return this.page.getByRole('region', { name: '쿠키 안내' });
  }

  동의버튼(): Locator {
    return this.영역().getByRole('button', { name: '동의', exact: true });
  }

  async 동의하기(): Promise<void> {
    if (await this.동의버튼().isVisible()) await this.동의버튼().click();
  }
}
