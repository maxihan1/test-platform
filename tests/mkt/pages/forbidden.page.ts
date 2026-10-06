import type { Locator, Page } from '@playwright/test';

export class 권한없음화면 {
  readonly 제목: Locator;
  readonly 안내문: Locator;
  readonly 홈으로링크: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '권한이 없습니다', level: 1 });
    this.안내문 = page.getByText('이 화면을 볼 수 있는 권한이 없습니다.', { exact: true });
    this.홈으로링크 = page.getByRole('link', { name: '홈으로', exact: true });
  }

  async 열기(주소: string): Promise<void> {
    await this.page.goto(주소);
    await this.제목.waitFor();
  }
}
