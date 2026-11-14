import type { Locator, Page } from '@playwright/test';

export class 개인멘션글화면 {
  static readonly 주소 = '/@{아이디}/{글번호}';

  readonly 본문영역: Locator;
  readonly 제목: Locator;

  constructor(private readonly page: Page) {
    this.본문영역 = page.getByRole('main');
    this.제목 = page.getByRole('main').getByRole('heading', { level: 1 });
  }

  async 열기(경로: string): Promise<void> {
    await this.page.goto(경로);
    await this.page.getByRole('navigation', { name: '메인' }).or(this.page.getByRole('main')).first().waitFor();
  }

  본문(글조각: string): Locator {
    return this.page.getByText(글조각);
  }
}
