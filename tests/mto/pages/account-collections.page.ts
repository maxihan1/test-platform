import type { Locator, Page } from '@playwright/test';

export class 계정컬렉션화면 {
  static readonly 주소 = '/admin/accounts/';

  readonly 제목: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { level: 1 }).first();
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
