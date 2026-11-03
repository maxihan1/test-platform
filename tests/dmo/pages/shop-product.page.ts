import type { Locator, Page } from '@playwright/test';

export class 쇼핑몰상품상세화면 {
  static readonly 주소 = '/shop/<번호>';
  readonly 제목: Locator;
  readonly 품절버튼: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { level: 1 });
    this.품절버튼 = page.getByRole('button', { name: '품절', exact: true });
  }

  async 열기(상품번호: number): Promise<void> {
    await this.page.goto(`/shop/${상품번호}`);
    await this.제목.waitFor();
  }
}
