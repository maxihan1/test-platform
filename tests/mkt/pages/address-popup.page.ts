import type { Locator, Page } from '@playwright/test';

export class 주소검색창 {
  readonly 제목: Locator;
  readonly 검색칸: Locator;
  readonly 검색버튼: Locator;
  readonly 결과목록: Locator;
  readonly 결과들: Locator;

  constructor(page: Page) {
    this.제목 = page.getByRole('heading', { name: '주소 검색', exact: true });
    this.검색칸 = page.getByLabel('도로명 주소 검색어', { exact: true });
    this.검색버튼 = page.getByRole('button', { name: '검색', exact: true });
    this.결과목록 = page.getByRole('list', { name: '검색 결과' });
    this.결과들 = this.결과목록.getByRole('button');
  }

  async 검색하기(글: string): Promise<void> {
    await this.검색칸.fill(글);
    await this.검색버튼.click();
    await this.결과들.first().waitFor();
  }

  async 첫결과의우편번호와주소(): Promise<string> {
    const 우편번호 = (await this.결과들.first().getAttribute('data-zip')) ?? '';
    const 주소 = (await this.결과들.first().getAttribute('data-addr')) ?? '';
    return `${우편번호} / ${주소}`;
  }

  async 첫결과고르기(): Promise<void> {
    await this.결과들.first().click();
  }
}
