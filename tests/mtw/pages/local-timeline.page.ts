import type { Locator, Page } from '@playwright/test';

export class 이서버타임라인화면 {
  static readonly 주소 = '/public/local';

  readonly 영역: Locator;
  readonly 이서버탭: Locator;
  readonly 글목록: Locator;

  constructor(private readonly page: Page) {
    this.영역 = page.getByRole('main').getByRole('region', { name: '실시간 피드' });
    this.이서버탭 = this.영역.getByRole('link', { name: '이 서버', exact: true });
    this.글목록 = this.영역.getByRole('feed').getByRole('article');
  }

  글(글조각: string): Locator {
    return this.글목록.filter({ hasText: 글조각 });
  }

  async 열기(): Promise<void> {
    await this.page.goto(이서버타임라인화면.주소);
    await this.그려질때까지();
  }

  async 그려질때까지(): Promise<void> {
    await this.이서버탭.waitFor();
    await this.글목록.first().waitFor();
  }
}
