import type { Locator, Page } from '@playwright/test';

export class 네트워크오류화면 {
  static readonly 주소 = '/@{아이디}';

  readonly 제목: Locator;
  readonly 다시시도: Locator;
  readonly 홈으로: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('main').getByText('네트워크 오류');
    this.다시시도 = page.getByRole('main').getByRole('button', { name: '다시 시도' });
    this.홈으로 = page.getByRole('main').getByRole('link', { name: '홈으로 돌아가기' }).or(page.getByRole('main').getByRole('button', { name: '홈으로 돌아가기' }));
  }

  async 열기(경로: string): Promise<void> {
    await this.page.goto(경로);
  }
}
