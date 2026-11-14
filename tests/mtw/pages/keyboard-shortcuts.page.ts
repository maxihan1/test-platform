import type { Locator, Page } from '@playwright/test';

export class 키보드단축키화면 {
  static readonly 주소 = '/keyboard-shortcuts';

  readonly 제목: Locator;
  readonly 표: Locator;
  readonly 핫키머리: Locator;
  readonly 설명머리: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { name: '키보드 단축키', level: 1 });
    this.표 = page.getByRole('main').getByRole('table');
    this.핫키머리 = this.표.getByRole('columnheader', { name: '핫키', exact: true });
    this.설명머리 = this.표.getByRole('columnheader', { name: '설명', exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto(키보드단축키화면.주소);
    await this.제목.waitFor();
  }
}
