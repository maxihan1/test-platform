import type { Locator, Page } from '@playwright/test';

export class 차단창 {
  static readonly 주소 = '/@{아이디}';

  readonly 창: Locator;
  readonly 제목: Locator;
  readonly 차단: Locator;
  readonly 취소: Locator;

  constructor(page: Page) {
    this.창 = page.getByRole('dialog');
    this.제목 = this.창.getByRole('heading', { level: 1 });
    this.차단 = this.창.getByRole('button', { name: '차단', exact: true });
    this.취소 = this.창.getByRole('button', { name: '취소' });
  }

  async 뜰때까지(): Promise<void> {
    await this.제목.waitFor();
  }

  async 닫기(): Promise<void> {
    await this.취소.click();
    await this.창.first().waitFor({ state: 'detached' });
  }
}
