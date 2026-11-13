import type { Locator, Page } from '@playwright/test';

export class 토스트 {
  readonly 상자: Locator;
  readonly 모두: Locator;

  constructor(page: Page) {
    this.상자 = page.locator('#toast-box');
    this.모두 = this.상자.locator('.toast');
  }

  글(문구: string | RegExp): Locator {
    return this.모두.filter({ hasText: 문구 });
  }

  async 뜰때까지(문구: string | RegExp, 기다림 = 10_000): Promise<boolean> {
    return this.글(문구).first().waitFor({ timeout: 기다림 }).then(() => true, () => false);
  }

  async 아무거나뜰때까지(기다림 = 10_000): Promise<string | null> {
    return this.모두.first().waitFor({ timeout: 기다림 }).then(async () => (await this.모두.first().innerText()).trim(), () => null);
  }
}
