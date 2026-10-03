import type { Locator, Page } from '@playwright/test';

export class 홈에서이동한화면 {
  constructor(private readonly page: Page) {}

  게시글제목(제목: string): Locator {
    return this.page.getByRole('heading', { name: 제목, level: 1, exact: true });
  }

  고객센터제목(): Locator {
    return this.page.getByRole('heading', { name: '고객센터', level: 1, exact: true });
  }
}
