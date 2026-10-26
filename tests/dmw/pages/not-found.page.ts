import type { Locator, Page } from '@playwright/test';

import { 머리글 } from '../components/header.component.js';

export class 없는주소화면 {
  static readonly 주소 = '/no-such-page';

  readonly 머리: 머리글;
  readonly 안내: Locator;
  readonly 홈으로: Locator;

  constructor(private readonly page: Page) {
    this.머리 = new 머리글(page);
    this.안내 = page.getByRole('heading', { level: 1, name: '페이지를 찾을 수 없습니다', exact: true });
    this.홈으로 = page.getByRole('main').getByRole('link', { name: '홈으로', exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto(없는주소화면.주소);
    await this.그려질때까지();
  }

  async 그려질때까지(): Promise<void> {
    await this.안내.waitFor();
    await this.머리.그려질때까지();
  }
}
