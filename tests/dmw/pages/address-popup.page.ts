import type { Locator, Page } from '@playwright/test';

import { 두프레임기다리기 } from '../helpers/common-tools.helper.js';

export class 주소검색창화면 {
  static readonly 주소 = '/popup/address';

  readonly 제목: Locator;
  readonly 검색칸: Locator;
  readonly 검색버튼: Locator;
  readonly 결과목록: Locator;
  readonly 결과버튼들: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { level: 1, name: '주소 검색', exact: true });
    this.검색칸 = page.getByRole('searchbox', { name: '도로명 주소 검색어' });
    this.검색버튼 = page.getByRole('button', { name: '검색', exact: true });
    this.결과목록 = page.getByRole('list', { name: '검색 결과' });
    this.결과버튼들 = this.결과목록.getByRole('button');
  }

  async 다그려질때까지(): Promise<void> {
    await this.제목.waitFor();
  }

  안내(글: string): Locator {
    return this.page.getByText(글, { exact: true });
  }

  async 검색(글: string): Promise<void> {
    await this.검색칸.fill(글);
    const 응답 = this.page.waitForResponse((r) => r.url().includes('/api/address'));
    await this.검색버튼.click();
    await 응답;
    await 두프레임기다리기(this.page);
  }

  async 결과나올때까지(): Promise<void> {
    await this.결과버튼들.first().waitFor();
  }

  async 결과고르기(): Promise<void> {
    try {
      await this.결과버튼들.first().click();
    } catch (오류) {
      if (!this.page.isClosed()) throw 오류;
    }
  }

  async 닫혔는가(): Promise<boolean> {
    const 닫힘 = this.page.waitForEvent('close', { timeout: 5000 }).then(
      () => true,
      () => false,
    );
    if (this.page.isClosed()) return true;
    return 닫힘;
  }

  async 첫결과글(): Promise<string> {
    return this.결과버튼들.first().innerText();
  }

  async 주소(): Promise<string> {
    return new URL(this.page.url()).pathname;
  }
}
