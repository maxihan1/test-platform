import type { Locator, Page } from '@playwright/test';

export class 게시판검색화면 {
  constructor(private readonly page: Page) {}

  async 열기(): Promise<void> {
    await this.page.goto('/board');
  }

  제목(): Locator {
    return this.page.getByRole('heading', { name: '커뮤니티', level: 1, exact: true });
  }

  검색어칸(): Locator {
    return this.page.getByLabel('검색어', { exact: true });
  }

  검색버튼(): Locator {
    return this.page.getByRole('button', { name: '검색', exact: true });
  }

  async 검색하기(검색어: string): Promise<void> {
    await this.검색어칸().fill(검색어);
    await this.검색버튼().click();
  }
}
