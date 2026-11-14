import type { Locator, Page } from '@playwright/test';

export class 홈링크화면 {
  static readonly 주소 = '/home';

  readonly 첫글카드: Locator;
  readonly 첫글작성자: Locator;
  readonly 내프로필카드: Locator;

  constructor(page: Page) {
    this.첫글카드 = page.getByRole('region', { name: '홈' }).getByRole('feed').getByRole('article').first();
    this.첫글작성자 = this.첫글카드.getByRole('link').first();
    this.내프로필카드 = page.getByRole('region', { name: '새 게시물' }).getByRole('link').first();
  }

  async 첫글카드그려질때까지(): Promise<void> {
    await this.첫글카드.waitFor();
  }
}
