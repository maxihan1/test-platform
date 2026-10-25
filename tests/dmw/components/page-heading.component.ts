import type { Locator, Page } from '@playwright/test';

export class 화면제목 {
  readonly 큰제목: Locator;

  constructor(private readonly page: Page) {
    this.큰제목 = page.getByRole('heading', { level: 1 });
  }

  글(제목: string | RegExp): Locator {
    return this.page.getByRole('heading', { level: 1, name: 제목 });
  }

  async 문서제목(): Promise<string> {
    return this.page.title();
  }
}
