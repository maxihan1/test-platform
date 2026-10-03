import type { Locator, Page } from '@playwright/test';

export class 주소검색창 {
  constructor(private readonly page: Page) {}

  제목(): Locator {
    return this.page.getByRole('heading', { name: '주소 검색', level: 1, exact: true });
  }

  검색어칸(): Locator {
    return this.page.getByLabel('도로명 주소 검색어', { exact: true });
  }

  검색버튼(): Locator {
    return this.page.getByRole('button', { name: '검색', exact: true });
  }

  결과목록(): Locator {
    return this.page.getByRole('list', { name: '검색 결과', exact: true });
  }

  결과(주소: string): Locator {
    return this.결과목록().getByRole('button').filter({ hasText: 주소 });
  }

  async 검색하기(검색어: string): Promise<void> {
    await this.검색어칸().fill(검색어);
    await this.검색버튼().click();
  }
}
