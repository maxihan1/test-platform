import type { Locator, Page } from '@playwright/test';

export class 개인멘션목록화면 {
  static readonly 주소 = '/conversations';

  readonly 제목: Locator;
  readonly 빈안내: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { name: '개인 멘션', level: 1 });
    this.빈안내 = page.getByText('개인 멘션이 없습니다. 보내거나 받으면 여기에 표시됩니다.');
  }

  async 열기(): Promise<void> {
    await this.page.goto(개인멘션목록화면.주소);
    await this.제목.waitFor();
  }
}
