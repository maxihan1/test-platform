import type { Locator, Page } from '@playwright/test';

export class 팔로우목록화면 {
  static readonly 주소 = '/@{아이디}/followers';

  readonly 제목: Locator;
  readonly 안내: Locator;
  readonly 항목들: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { level: 1 });
    this.안내 = page.getByRole('main').getByRole('region');
    this.항목들 = page.getByRole('main').getByRole('article');
  }

  async 팔로워열기(아이디: string): Promise<void> {
    await this.page.goto(`/@${아이디}/followers`);
    await this.제목.waitFor();
  }

  async 팔로잉열기(아이디: string): Promise<void> {
    await this.page.goto(`/@${아이디}/following`);
    await this.제목.waitFor();
  }

  글(문구: string): Locator {
    return this.page.getByText(문구);
  }

  계정(아이디: string): Locator {
    return this.항목들.filter({ hasText: `@${아이디}@` });
  }
}
