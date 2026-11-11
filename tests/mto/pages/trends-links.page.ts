import type { Locator, Page } from '@playwright/test';

export class 유행링크화면 {
  static readonly 주소 = '/admin/trends/links';

  readonly 제목: Locator;
  readonly 링크허용: Locator;
  readonly 발행처허용: Locator;
  readonly 링크금지: Locator;
  readonly 발행처비허용: Locator;
  readonly 발행처: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '유행하는 링크', level: 1 });
    this.링크허용 = page.getByRole('button', { name: '링크 허용', exact: true });
    this.발행처허용 = page.getByRole('button', { name: '발행처 허용', exact: true });
    this.링크금지 = page.getByRole('button', { name: '링크 금지', exact: true });
    this.발행처비허용 = page.getByRole('button', { name: '발행처 비허용', exact: true });
    this.발행처 = page.getByRole('main').getByRole('link', { name: '발행처', exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto(유행링크화면.주소);
    await this.제목.waitFor();
    await this.링크허용.waitFor();
  }
}
