import type { Locator, Page } from '@playwright/test';

export class 주소검색창 {
  static readonly 주소 = '/popup/address';
  readonly 제목: Locator;
  readonly 검색칸: Locator;
  readonly 검색버튼: Locator;
  readonly 안내: Locator;
  readonly 결과목록: Locator;
  readonly 결과들: Locator;
  readonly 결과버튼들: Locator;
  readonly 결과없음: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '주소 검색', level: 1 });
    this.검색칸 = page.getByRole('searchbox', { name: '도로명 주소 검색어' });
    this.검색버튼 = page.getByRole('button', { name: '검색', exact: true });
    this.안내 = page.getByRole('alert');
    this.결과목록 = page.getByRole('list', { name: '검색 결과' });
    this.결과들 = this.결과목록.getByRole('listitem');
    this.결과버튼들 = this.결과목록.getByRole('button');
    this.결과없음 = this.결과목록.getByText('검색 결과가 없습니다');
  }

  결과(글: string | RegExp): Locator {
    return this.결과목록.getByRole('button', { name: 글 });
  }

  async 뜰때까지(): Promise<void> {
    await this.제목.waitFor();
  }

  async 검색하기(검색어: string): Promise<void> {
    await this.검색칸.fill(검색어);
    await this.검색버튼.click();
  }

  async 결과나올때까지(): Promise<void> {
    await this.결과들.first().waitFor();
  }
}
