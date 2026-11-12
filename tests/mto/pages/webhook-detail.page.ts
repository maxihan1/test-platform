import type { Locator, Page } from '@playwright/test';

export class 웹훅상세화면 {
  static readonly 주소 = '/admin/webhooks/';

  readonly 비활성화: Locator;
  readonly 비밀키회전: Locator;
  readonly 비밀키서명: Locator;

  constructor(page: Page) {
    this.비활성화 = page.getByRole('link', { name: '비활성화' });
    this.비밀키회전 = page.getByRole('link', { name: '비밀키 회전' });
    this.비밀키서명 = page.locator('tr').filter({ has: page.getByRole('rowheader', { name: '비밀키 서명' }) }).locator('samp');
  }

  async 그려질때까지(): Promise<void> {
    await this.비밀키서명.waitFor();
  }
}
