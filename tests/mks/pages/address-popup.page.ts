import type { Locator, Page } from '@playwright/test';

export class 주소검색창 {
  static readonly 주소 = '/popup/address';

  readonly 제목: Locator;
  readonly 검색어: Locator;
  readonly 검색: Locator;
  readonly 결과목록: Locator;
  readonly 결과들: Locator;
  readonly 오류: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '주소 검색', level: 1 });
    this.검색어 = page.getByLabel('도로명 주소 검색어');
    this.검색 = page.getByRole('button', { name: '검색', exact: true });
    this.결과목록 = page.getByRole('list', { name: '검색 결과' });
    this.결과들 = this.결과목록.getByRole('button');
    this.오류 = page.getByRole('alert');
  }

  안내글(글: string): Locator {
    return this.page.getByText(글, { exact: true });
  }

  async 검색하기(검색어: string): Promise<void> {
    await this.검색어.fill(검색어);
    await this.검색.click();
  }

  async 첫결과고르기(): Promise<void> {
    try {
      await this.결과들.first().click();
    } catch (오류) {
      if (!this.page.isClosed()) throw 오류;
    }
  }
}
