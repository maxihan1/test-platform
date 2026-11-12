import type { Locator, Page } from '@playwright/test';

import { 알림 } from '../components/flash.component.js';

export class 역할화면 {
  static readonly 주소 = '/admin/roles';

  readonly 제목: Locator;
  readonly 알림: 알림;
  readonly 역할추가: Locator;
  readonly 기본권한카드: Locator;
  readonly 기본권한수정: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '역할', level: 1, exact: true });
    this.알림 = new 알림(page);
    this.역할추가 = page.getByRole('link', { name: '역할 추가' });
    this.기본권한카드 = page.locator('.announcements-list__item').filter({ has: page.getByRole('link', { name: '기본 권한' }) });
    this.기본권한수정 = this.기본권한카드.getByRole('link', { name: '수정' });
  }

  async 열기(): Promise<void> {
    await this.page.goto(역할화면.주소);
    await this.제목.waitFor();
    await this.역할추가.waitFor();
  }

  카드(이름: string): Locator {
    return this.page.locator('.announcements-list__item').filter({ has: this.page.getByRole('link', { name: 이름, exact: true }) });
  }

  사용자수(이름: string): Locator {
    return this.카드(이름).getByRole('link', { name: /명의 사용자$/ });
  }

  async 설명글(이름: string): Promise<string> {
    const 글 = await this.카드(이름).locator('.announcements-list__item__meta').innerText();
    return 글.replace(/\s+/g, ' ').trim();
  }

  권한수(이름: string): Locator {
    return this.카드(이름).locator('abbr');
  }

  async 역할이름들(): Promise<string[]> {
    const 글들 = await this.page.locator('.announcements-list__item__title').allInnerTexts();
    return 글들.map((글) => 글.trim());
  }

  현재경로와검색어(): string {
    const 주소 = new URL(this.page.url());
    return 주소.pathname + 주소.search;
  }

  수정(이름: string): Locator {
    return this.카드(이름).getByRole('link', { name: '수정' });
  }
}
