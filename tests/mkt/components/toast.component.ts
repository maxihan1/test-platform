import type { Locator, Page } from '@playwright/test';

export class 토스트 {
  readonly 상자: Locator;
  readonly 모두: Locator;

  constructor(readonly page: Page) {
    this.상자 = page.locator('#toast-box');
    this.모두 = this.상자.locator('.toast');
  }

  문구(글: string): Locator {
    return this.모두.filter({ hasText: 글 });
  }

  async 뜰때까지(글: string): Promise<Locator> {
    const 그것 = this.문구(글).first();
    await 그것.waitFor();
    return 그것;
  }

  async 아무거나뜰때까지(): Promise<Locator> {
    const 그것 = this.모두.last();
    await 그것.waitFor();
    return 그것;
  }
}
