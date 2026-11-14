import type { Locator, Page } from '@playwright/test';

import { 설정틀 } from '../components/settings-shell.component.js';

export class 설정화면 {
  static readonly 주소 = '/settings/profile';

  readonly 틀: 설정틀;
  readonly 환경설정: Locator;
  readonly 외관: Locator;
  readonly 이단계인증: Locator;

  constructor(private readonly page: Page) {
    this.틀 = new 설정틀(page);
    this.환경설정 = this.틀.메뉴('환경설정');
    this.외관 = this.틀.메뉴('외관');
    this.이단계인증 = this.틀.메뉴('2단계 인증');
  }

  항목(이름: string): Locator {
    return this.틀.왼쪽메뉴.getByRole('link', { name: 이름, exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto(설정화면.주소);
    await this.그려질때까지();
  }

  async 그려질때까지(): Promise<void> {
    await this.틀.왼쪽메뉴.waitFor();
    await this.환경설정.waitFor();
  }

  async 환경설정열기(): Promise<void> {
    await this.환경설정.click();
    await this.틀.저장.waitFor();
  }
}
