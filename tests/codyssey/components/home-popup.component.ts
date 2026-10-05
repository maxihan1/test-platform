import type { Locator, Page } from '@playwright/test';

export class 홈공지팝업 {
  readonly ost: Locator;
  readonly 대전모집: Locator;

  constructor(page: Page) {
    this.ost = page.getByRole('dialog', { name: 'OST2026' });
    this.대전모집 = page.getByRole('dialog', { name: '대전 코디세이 AI 올인원 모집' });
  }

  닫기버튼(팝업: Locator): Locator {
    return 팝업.getByRole('button', { name: '닫기' });
  }

  async 닫는다(팝업: Locator): Promise<void> {
    await this.닫기버튼(팝업).click();
  }

  async 모두닫는다(): Promise<void> {
    await this.닫는다(this.ost);
    await this.닫는다(this.대전모집);
  }
}
