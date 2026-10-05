import type { Locator, Page } from '@playwright/test';

export class 회원홈화면 {
  readonly 제목: Locator;
  readonly 배너제목들: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '데모마켓 홈', level: 1 });
    this.배너제목들 = page.getByRole('region', { name: '배너', exact: true }).getByRole('heading', { level: 2 });
  }

  async 열기(): Promise<void> {
    await this.page.goto('/');
    await this.제목.waitFor();
    await this.배너제목들.first().waitFor();
  }
}
