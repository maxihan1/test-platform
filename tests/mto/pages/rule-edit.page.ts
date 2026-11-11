import type { Locator, Page } from '@playwright/test';

export class 서버규칙수정화면 {
  static readonly 주소 = '/admin/rules/';

  readonly 제목: Locator;
  readonly 번역추가: Locator;

  constructor(page: Page) {
    this.제목 = page.getByRole('heading', { name: '규칙 수정', level: 1 });
    this.번역추가 = page.getByRole('link', { name: '번역 추가' });
  }

  async 그려질때까지(): Promise<void> {
    await this.제목.waitFor();
  }
}
