import type { Locator, Page } from '@playwright/test';

export class 소개화면 {
  readonly 제목: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '코디세이 소개', level: 1 });
  }

  구역제목(이름: string): Locator {
    return this.page.getByRole('heading', { name: 이름, exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto('/about/intro');
  }
}
