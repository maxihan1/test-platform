import type { Locator, Page } from '@playwright/test';

import { 알림 } from '../components/flash.component.js';

export class 유행해시태그화면 {
  static readonly 주소 = '/admin/trends/tags';

  readonly 제목: Locator;
  readonly 알림: 알림;
  readonly 전체: Locator;
  readonly 승인됨: Locator;
  readonly 거부됨: Locator;
  readonly 대기중: Locator;
  readonly 허용: Locator;
  readonly 금지: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '유행하는 해시태그', level: 1 });
    this.알림 = new 알림(page);
    this.전체 = page.getByRole('main').getByRole('link', { name: '전체', exact: true });
    this.승인됨 = page.getByRole('main').getByRole('link', { name: '승인됨', exact: true });
    this.거부됨 = page.getByRole('main').getByRole('link', { name: '거부됨', exact: true });
    this.대기중 = page.getByRole('main').getByRole('link', { name: /^대기 중 \(\d+\)$/ });
    this.허용 = page.getByRole('button', { name: '허용', exact: true });
    this.금지 = page.getByRole('button', { name: '금지', exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto(유행해시태그화면.주소);
    await this.제목.waitFor();
    await this.허용.waitFor();
  }
}
