import type { Locator, Page } from '@playwright/test';

export class 주소검색창 {
  static readonly 주소 = '/popup/address';

  readonly page: Page;
  readonly 제목: Locator;
  readonly 검색어칸: Locator;
  readonly 검색버튼: Locator;
  readonly 결과: Locator;

  constructor(page: Page) {
    this.page = page;
    this.제목 = page.getByRole('heading', { name: '주소 검색' });
    this.검색어칸 = page.getByRole('searchbox', { name: '도로명 주소 검색어' });
    this.검색버튼 = page.getByRole('button', { name: '검색', exact: true });
    this.결과 = page.getByRole('list', { name: '검색 결과' }).getByRole('button');
  }

  async 검색하기(검색어: string): Promise<void> {
    await this.검색어칸.fill(검색어);
    await this.검색버튼.click();
    await this.결과.first().waitFor();
  }

  async 첫결과글(): Promise<{ 우편번호: string; 주소: string }> {
    const 우편번호 = (await this.결과.first().locator('.zip').innerText()).trim();
    const 전체 = (await this.결과.first().innerText()).trim();
    return { 우편번호, 주소: 전체.slice(우편번호.length).trim() };
  }

  async 첫결과고르기(): Promise<void> {
    await this.결과.first().click();
  }
}
