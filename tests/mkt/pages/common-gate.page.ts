import type { Locator, Page } from '@playwright/test';

export class 로그인필요화면 {
  constructor(private readonly page: Page) {}

  async 열기(경로: string): Promise<void> {
    await this.page.goto(경로);
  }

  글쓰기제목(): Locator {
    return this.page.getByRole('heading', { name: '글쓰기', level: 1, exact: true });
  }
}
