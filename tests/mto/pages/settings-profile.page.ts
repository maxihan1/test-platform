import type { Locator, Page } from '@playwright/test';

import { 사이드바 } from '../components/sidebar.component.js';

export class 공개프로필화면 {
  static readonly 주소 = '/settings/profile';

  readonly 제목: Locator;
  readonly 사이드바: 사이드바;
  readonly 로그아웃: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '공개 프로필', level: 1 });
    this.사이드바 = new 사이드바(page);
    this.로그아웃 = this.사이드바.메뉴('로그아웃');
  }

  async 열기(): Promise<void> {
    await this.page.goto(공개프로필화면.주소);
    await this.제목.waitFor();
    await this.사이드바.그려질때까지();
  }
}
