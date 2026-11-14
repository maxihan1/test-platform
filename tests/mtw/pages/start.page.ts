import type { Locator, Page } from '@playwright/test';

export class 시작하기화면 {
  static readonly 주소 = '/start';

  readonly 제목: Locator;
  readonly 다음단계: Locator;
  readonly 프로필설정제목: Locator;

  constructor(page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { name: '사람들을 팔로우하기', level: 1 });
    this.다음단계 = page.getByRole('link', { name: '다음: 프로필 설정' });
    this.프로필설정제목 = page.getByRole('main').getByRole('heading', { name: '프로필 설정' });
  }

  async 그려질때까지(): Promise<void> {
    await this.제목.waitFor();
  }
}
