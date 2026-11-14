import type { Locator, Page } from '@playwright/test';

export class 고정글화면 {
  static readonly 주소 = '/pinned';

  readonly 제목: Locator;
  readonly 글목록: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { name: '고정된 게시물', level: 1 });
    this.글목록 = page.getByRole('main').getByRole('feed').getByRole('article');
  }

  글(글조각: string): Locator {
    return this.글목록.filter({ hasText: 글조각 });
  }

  async 열기(): Promise<void> {
    await this.page.goto(고정글화면.주소);
    await this.그려질때까지();
  }

  async 그려질때까지(): Promise<void> {
    await this.제목.waitFor();
    await this.글목록.first().waitFor();
  }
}
