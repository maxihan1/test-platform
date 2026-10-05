import type { Locator, Page } from '@playwright/test';

export class 모집안내화면 {
  readonly page: Page;
  readonly 제목: Locator;

  constructor(page: Page) {
    this.page = page;
    this.제목 = page.getByRole('main').getByRole('heading', { name: 'AI 올인원', level: 1, exact: true });
  }

  혜택(이름: string): Locator {
    return this.page.getByRole('main').getByText(이름, { exact: true });
  }

  async 연다(): Promise<void> {
    await this.page.goto('/guide/recruitmentNotice');
  }
}
