import type { Locator, Page } from '@playwright/test';

export class 없는주소화면 {
  static readonly 주소 = '/no-such-page';

  readonly page: Page;
  readonly 제목: Locator;
  readonly 안내: Locator;
  readonly 홈으로: Locator;

  constructor(page: Page) {
    this.page = page;
    this.제목 = page.getByRole('heading', { name: '페이지를 찾을 수 없습니다' });
    this.안내 = page.getByText('주소가 바뀌었거나 삭제된 페이지입니다.');
    this.홈으로 = page.getByRole('link', { name: '홈으로' });
  }

  async 열기(): Promise<void> {
    await this.page.goto(없는주소화면.주소);
    await this.제목.waitFor();
  }
}
