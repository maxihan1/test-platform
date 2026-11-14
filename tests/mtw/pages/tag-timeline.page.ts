import type { Locator, Page } from '@playwright/test';

export class 태그타임라인화면 {
  static readonly 주소 = '/tags/{태그}';

  readonly 글목록: Locator;
  readonly 빈안내: Locator;

  constructor(private readonly page: Page) {
    this.글목록 = page.getByRole('main').getByRole('feed').getByRole('article');
    this.빈안내 = page.getByText('이 해시태그는 아직 사용되지 않았습니다.');
  }

  제목(태그: string): Locator {
    return this.page.getByRole('main').getByRole('heading', { name: `#${태그}`, level: 1 });
  }

  글(글조각: string): Locator {
    return this.글목록.filter({ hasText: 글조각 });
  }

  async 열기(태그: string): Promise<void> {
    await this.page.goto(`/tags/${encodeURIComponent(태그)}`);
    await this.제목(태그).waitFor();
    await this.page.getByRole('main').getByRole('progressbar').first().waitFor({ state: 'hidden' });
  }
}
