import type { Locator, Page } from '@playwright/test';

export class 뮤트목록화면 {
  static readonly 주소 = '/mutes';

  readonly 제목: Locator;
  readonly 빈안내: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { name: '뮤트한 사용자', level: 1 });
    this.빈안내 = page.getByText('아직 아무도 뮤트하지 않았습니다.');
  }

  async 열기(): Promise<void> {
    await this.page.goto(뮤트목록화면.주소);
    await this.제목.waitFor();
  }
}
