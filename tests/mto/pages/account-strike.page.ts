import type { Locator, Page } from '@playwright/test';

export class 계정처벌화면 {
  static readonly 주소 = '/disputes/strikes/';

  readonly 제목: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { level: 1 }).first();
  }

  async 그려질때까지(): Promise<void> {
    await this.제목.waitFor();
  }

  문단(글: string): Locator {
    return this.page.getByRole('paragraph').filter({ hasText: 글 });
  }
}
