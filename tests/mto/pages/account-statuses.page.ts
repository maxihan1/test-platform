import type { Locator, Page } from '@playwright/test';

export class 계정게시물화면 {
  static readonly 주소 = '/admin/accounts/';

  readonly 제목: Locator;
  readonly 필터모두: Locator;
  readonly 필터미디어있음: Locator;
  readonly 신고: Locator;
  readonly 게시물행들: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { level: 1 }).first();
    this.필터모두 = page.getByRole('main').getByRole('link', { name: '모두', exact: true });
    this.필터미디어있음 = page.getByRole('main').getByRole('link', { name: '미디어 있음', exact: true });
    this.신고 = page.getByRole('button', { name: '신고' });
    this.게시물행들 = page.locator('.batch-table__row');
  }

  async 열기(계정번호: string): Promise<number> {
    const 응답 = await this.page.goto(`${계정게시물화면.주소}${계정번호}/statuses`);
    await this.제목.waitFor();
    return 응답?.status() ?? 0;
  }

  async 그려질때까지(): Promise<void> {
    await this.게시물행들.first().waitFor();
  }

  첫행선택칸(): Locator {
    return this.게시물행들.first().getByRole('checkbox');
  }

  첫행시각링크(): Locator {
    return this.게시물행들.first().getByRole('link', { name: /^\d{4}년/ });
  }

  async 제목글(): Promise<string> {
    return (await this.제목.innerText()).trim();
  }
}
