import type { Locator, Page } from '@playwright/test';

export class 사람들상세화면 {
  readonly 제목: Locator;
  readonly 목록버튼: Locator;

  constructor(page: Page) {
    const 본문 = page.getByRole('main');
    this.제목 = 본문.getByRole('heading', { name: '코디세이 사람들', level: 2 });
    this.목록버튼 = 본문.getByRole('button', { name: '목록', exact: true });
  }
}
