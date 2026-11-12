import type { Locator, Page } from '@playwright/test';

export class 계정컬렉션화면 {
  static readonly 주소 = '/admin/accounts/';

  readonly 제목: Locator;
  readonly 신고에추가: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { level: 1 }).first();
    this.신고에추가 = page.getByRole('button', { name: /^신고 #\d+에 추가$/ }).or(page.getByRole('link', { name: /^신고 #\d+에 추가$/ })).first();
  }

  async 열기(계정번호: string, 신고번호?: string): Promise<number> {
    const 조건 = 신고번호 === undefined ? '' : `?report_id=${신고번호}`;
    const 응답 = await this.page.goto(`${계정컬렉션화면.주소}${계정번호}/collections${조건}`);
    await this.제목.waitFor();
    return 응답?.status() ?? 0;
  }

  async 제목글(): Promise<string> {
    return (await this.제목.innerText()).trim();
  }
}
