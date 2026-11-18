import type { Locator, Page } from '@playwright/test';

export class 계정관계화면 {
  static readonly 주소 = '/admin/accounts/';

  readonly 제목: Locator;
  readonly 관계필터: Locator;
  readonly 위치필터: Locator;

  constructor(page: Page) {
    this.제목 = page.getByRole('heading', { level: 1 }).first();
    this.관계필터 = page.locator('.filter-subset').filter({ has: page.getByText('관계', { exact: true }) });
    this.위치필터 = page.locator('.filter-subset').filter({ has: page.getByText('위치', { exact: true }) });
  }

  async 제목글(): Promise<string> {
    return (await this.제목.innerText()).trim();
  }
}
