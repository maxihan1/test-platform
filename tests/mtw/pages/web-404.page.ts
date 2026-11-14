import type { Locator, Page } from '@playwright/test';

export class 웹앱없는경로화면 {
  static readonly 주소 = '/statuses/none-existing-path';

  readonly 코드: Locator;
  readonly 안내: Locator;

  constructor(private readonly page: Page) {
    this.코드 = page.getByRole('main').getByRole('heading', { name: '404', level: 2 });
    this.안내 = page.getByRole('main').getByText('요청하신 페이지를 찾을 수 없습니다. 주소창에 적힌 URL이 확실히 맞나요?');
  }

  async 열기(): Promise<void> {
    await this.page.goto(웹앱없는경로화면.주소);
    await this.코드.waitFor();
  }
}
