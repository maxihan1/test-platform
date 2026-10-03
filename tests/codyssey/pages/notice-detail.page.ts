import type { Locator, Page } from '@playwright/test';

export class 공지상세화면 {
  constructor(private readonly page: Page) {}

  private get 본문(): Locator {
    return this.page.getByRole('main');
  }

  get 목록버튼(): Locator {
    return this.본문.getByRole('button', { name: '목록', exact: true });
  }

  글제목(제목: string): Locator {
    return this.본문.getByRole('heading', { level: 2, name: 제목, exact: true });
  }
}
