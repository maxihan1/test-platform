import type { Locator, Page } from '@playwright/test';

export class FAQ상세화면 {
  readonly page: Page;
  readonly 제목: Locator;
  readonly 목록버튼: Locator;

  constructor(page: Page) {
    this.page = page;
    const 본문 = page.getByRole('main');
    this.제목 = 본문.getByRole('heading', { name: 'FAQ', exact: true, level: 2 });
    this.목록버튼 = 본문.getByRole('button', { name: '목록', exact: true });
  }

  async 연다(번호: string): Promise<void> {
    await this.page.goto(`/board/faqDetail?pstartSn=${번호}`);
  }
}
