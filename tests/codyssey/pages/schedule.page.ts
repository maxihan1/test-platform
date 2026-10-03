import type { Locator, Page } from '@playwright/test';

export class 교육일정화면 {
  readonly 제목: Locator;
  readonly 표: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '연간 교육일정', level: 1 });
    this.표 = page.getByRole('table', { name: '연간 교육일정' });
  }

  줄(이름: string): Locator {
    return this.표.getByRole('cell', { name: 이름, exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto('/apply/schedule');
  }
}
