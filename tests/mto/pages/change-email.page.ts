import type { Locator, Page } from '@playwright/test';

import { 알림 } from '../components/flash.component.js';

export class 이메일바꾸기화면 {
  static readonly 주소 = '/admin/accounts/';

  readonly 제목: Locator;
  readonly 알림: 알림;
  readonly 현재이메일: Locator;
  readonly 새이메일: Locator;
  readonly 바꾸기: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { level: 1 }).first();
    this.알림 = new 알림(page);
    this.현재이메일 = page.getByRole('textbox', { name: '현재 이메일' });
    this.새이메일 = page.getByRole('textbox', { name: '새 이메일' });
    this.바꾸기 = page.getByRole('button', { name: '이메일 바꾸기' });
  }

  async 그려질때까지(): Promise<void> {
    await this.바꾸기.waitFor();
  }

  async 이메일바꾸기(이메일: string): Promise<void> {
    await this.새이메일.fill(이메일);
    await this.바꾸기.click();
    await this.page.waitForLoadState('load');
  }
}
