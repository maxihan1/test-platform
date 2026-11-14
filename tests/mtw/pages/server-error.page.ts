import type { Locator, Page } from '@playwright/test';

export class 서버오류화면 {
  static readonly 주소 = '/settings/profile';

  constructor(private readonly page: Page) {}

  안내(문구: string): Locator {
    return this.page.getByText(문구);
  }

  async 없는설정열기(): Promise<void> {
    await this.page.goto('/settings/none-existing-page');
  }

  async 설정열기(): Promise<void> {
    await this.page.goto(서버오류화면.주소);
  }
}
