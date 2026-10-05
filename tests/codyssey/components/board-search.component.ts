import type { Locator, Page } from '@playwright/test';

export class 게시판검색 {
  readonly 검색어칸: Locator;
  readonly 검색버튼: Locator;

  constructor(page: Page) {
    const 본문 = page.getByRole('main');
    this.검색어칸 = 본문.getByPlaceholder('검색어를 입력하세요.');
    this.검색버튼 = 본문.getByRole('button', { name: '검색', exact: true });
  }

  async 검색한다(검색어: string): Promise<void> {
    await this.검색어칸.fill(검색어);
    await this.검색버튼.click();
  }
}
