import type { Locator, Page } from '@playwright/test';

import { 알림 } from '../components/flash.component.js';
import { 사이드바 } from '../components/sidebar.component.js';

export class 대시보드화면 {
  static readonly 주소 = '/admin/dashboard';

  readonly 제목: Locator;
  readonly 규칙경고: Locator;
  readonly 규칙관리링크: Locator;
  readonly 알림: 알림;
  readonly 사이드바: 사이드바;
  readonly 점검경고: Locator;
  readonly 기간: Locator;
  readonly 대기신고: Locator;
  readonly 대기사용자: Locator;
  readonly 대기해시태그: Locator;
  readonly 대기이의제기: Locator;
  readonly 새사용자타일: Locator;
  readonly 활성사용자타일: Locator;
  readonly 신고열림타일: Locator;
  readonly 유행영역: Locator;
  readonly 유지율첫행: Locator;
  readonly 소프트웨어첫행: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '대시보드', level: 1 });
    this.규칙경고 = page.getByText('아직 서버 규칙을 정하지 않았습니다.');
    this.규칙관리링크 = page.getByRole('link', { name: '서버 규칙 관리' });
    this.알림 = new 알림(page);
    this.사이드바 = new 사이드바(page);
    this.점검경고 = this.알림.모두.filter({ hasText: /업데이트|데이터베이스|Sidekiq/ }).first();
    this.기간 = page.getByText(/^\s*\d{4}-\d{2}-\d{2} - \d{4}-\d{2}-\d{2}\s*$/);
    this.대기신고 = page.getByRole('link', { name: /건의 대기 중인 신고$/ });
    this.대기사용자 = page.getByRole('link', { name: /명의 대기 중인 사용자$/ });
    this.대기해시태그 = page.getByRole('link', { name: /개의 대기 중인 해시태그$/ });
    this.대기이의제기 = page.getByRole('link', { name: /개의 대기 중인 이의 제기$/ });
    this.새사용자타일 = page.getByRole('link', { name: /새 사용자$/ });
    this.활성사용자타일 = page.getByRole('link', { name: /활성 사용자$/ });
    this.신고열림타일 = page.getByRole('link', { name: /신고 열림$/ });
    this.유행영역 = page.locator('[data-admin-component="Trends"]');
    this.유지율첫행 = page.getByRole('row', { name: /^평균/ });
    this.소프트웨어첫행 = page.getByRole('row', { name: /^Mastodon / });
  }

  async 열기(): Promise<number> {
    const 응답 = await this.page.goto(대시보드화면.주소);
    await this.page.getByRole('heading', { level: 1 }).first().waitFor();
    return 응답?.status() ?? 0;
  }

  async 그려질때까지(): Promise<void> {
    await this.제목.waitFor();
    await this.유지율첫행.waitFor();
    await this.소프트웨어첫행.waitFor();
  }

  타일(이름: string): Locator {
    return this.page.locator('.sparkline').getByText(이름, { exact: true });
  }

  타일줄(이름: string): Locator {
    return this.page.locator('.sparkline').filter({ has: this.page.getByText(이름, { exact: true }) });
  }

  타일숫자(이름: string): Locator {
    return this.타일줄(이름).getByText(/^[\d,.]+$/).first();
  }

  소제목(이름: string): Locator {
    return this.page.getByRole('heading', { name: 이름, exact: true, level: 2 });
  }
}
