import type { Locator, Page } from '@playwright/test';

export class 팔로우추천화면 {
  static readonly 주소 = '/admin/follow_recommendations';

  readonly 제목: Locator;
  readonly 활성: Locator;
  readonly 숨겨짐: Locator;
  readonly 추천숨기기: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '팔로우 추천', level: 1 });
    this.활성 = page.getByRole('main').getByRole('link', { name: '활성', exact: true });
    this.숨겨짐 = page.getByRole('main').getByRole('link', { name: '숨겨짐', exact: true });
    this.추천숨기기 = page.getByRole('button', { name: '팔로우 추천 숨기기', exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto(팔로우추천화면.주소);
    await this.제목.waitFor();
    await this.추천숨기기.waitFor();
  }
}
