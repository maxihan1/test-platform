import type { Locator, Page } from '@playwright/test';

export class 좋아요화면 {
  static readonly 주소 = '/favourites';

  readonly 제목: Locator;
  readonly 영역: Locator;
  readonly 글목록: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { name: '좋아요', level: 1 });
    this.영역 = page.getByRole('main').getByRole('region', { name: '좋아요' });
    this.글목록 = this.영역.getByRole('article');
  }

  글(글조각: string): Locator {
    return this.글목록.filter({ hasText: 글조각 });
  }

  안내(문구: string): Locator {
    return this.page.getByRole('main').getByText(문구);
  }

  async 열기(): Promise<void> {
    await this.page.goto(좋아요화면.주소);
    await this.그려질때까지();
  }

  async 그려질때까지(): Promise<void> {
    await this.제목.waitFor();
    await this.page.getByRole('main').getByRole('progressbar').first().waitFor({ state: 'hidden' });
  }
}
