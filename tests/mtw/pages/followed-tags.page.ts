import type { Locator, Page } from '@playwright/test';

export class 팔로우한해시태그화면 {
  static readonly 주소 = '/followed_tags';

  readonly 제목: Locator;
  readonly 빈안내: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { level: 1 });
    this.빈안내 = page.getByText('아직 아무 해시태그도 팔로우하고 있지 않습니다. 해시태그를 팔로우하면, 여기에 표시됩니다.');
  }

  async 열기(): Promise<void> {
    await this.page.goto(팔로우한해시태그화면.주소);
    await this.제목.waitFor();
  }
}
