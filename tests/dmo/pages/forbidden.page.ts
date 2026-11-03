import type { Locator, Page } from '@playwright/test';

export class 권한없음화면 {
  static readonly 주소 = '/ops';
  readonly 제목: Locator;
  readonly 안내문: Locator;
  readonly 홈으로: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '권한이 없습니다' });
    this.안내문 = page.getByText('이 화면을 볼 수 있는 권한이 없습니다.');
    this.홈으로 = page.getByRole('link', { name: '홈으로' });
  }

  async 열기(): Promise<void> {
    await this.page.goto(권한없음화면.주소);
    await this.홈으로.waitFor();
  }
}
