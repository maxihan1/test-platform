import type { Locator, Page } from '@playwright/test';

export class 홈오류화면 {
  static readonly 주소 = '/home';

  readonly 빈도제한안내: Locator;

  constructor(private readonly page: Page) {
    this.빈도제한안내 = page.getByText('빈도 제한됨');
  }

  async 열기(): Promise<void> {
    await this.page.goto(홈오류화면.주소);
  }

  async 안내뜰때까지(): Promise<boolean> {
    return this.빈도제한안내.first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
  }
}
