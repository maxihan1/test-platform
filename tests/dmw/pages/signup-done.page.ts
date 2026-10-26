import type { Locator, Page } from '@playwright/test';

import { 머리글 } from '../components/header.component.js';

export class 가입완료화면 {
  static readonly 주소 = '/signup/done';

  readonly 머리: 머리글;
  readonly 큰제목: Locator;
  readonly 로그인하러가기: Locator;

  constructor(private readonly page: Page) {
    this.머리 = new 머리글(page);
    this.큰제목 = page.getByRole('main').getByRole('heading', { level: 1 });
    this.로그인하러가기 = page.getByRole('main').getByRole('link', { name: '로그인하러 가기', exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto(가입완료화면.주소);
    await this.그려질때까지();
  }

  async 그려질때까지(): Promise<void> {
    await this.로그인하러가기.waitFor();
    await this.머리.그려질때까지();
  }
}
