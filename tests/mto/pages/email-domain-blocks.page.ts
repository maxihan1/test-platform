import type { Locator, Page } from '@playwright/test';

import { 알림 } from '../components/flash.component.js';

export class 이메일도메인차단목록화면 {
  static readonly 주소 = '/admin/email_domain_blocks';

  readonly 제목: Locator;
  readonly 알림: 알림;
  readonly 새로추가하기: Locator;
  readonly 도메인칸: Locator;
  readonly 검색: Locator;
  readonly 초기화: Locator;
  readonly 삭제하기: Locator;
  readonly 비어있음: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '차단된 이메일 도메인', level: 1 });
    this.알림 = new 알림(page);
    this.새로추가하기 = page.getByRole('link', { name: '새로 추가하기' });
    this.도메인칸 = page.getByRole('textbox', { name: '도메인' });
    this.검색 = page.getByRole('button', { name: '검색' });
    this.초기화 = page.getByRole('link', { name: '초기화' });
    this.삭제하기 = page.getByRole('button', { name: '삭제하기' });
    this.비어있음 = page.getByText('아무 것도 없습니다!');
  }

  async 열기(): Promise<number> {
    const 응답 = await this.page.goto(이메일도메인차단목록화면.주소);
    await this.page.getByRole('heading', { level: 1 }).first().waitFor();
    return 응답?.status() ?? 0;
  }

  행(도메인: string): Locator {
    return this.page.locator('.batch-table__row').filter({ has: this.page.getByRole('link', { name: 도메인, exact: true }) });
  }

  도메인링크(도메인: string): Locator {
    return this.page.getByRole('link', { name: 도메인, exact: true });
  }

  시도수(도메인: string): Locator {
    return this.행(도메인).getByText(/지난 주 동안 \d+건의 가입 시도가 있었습니다/);
  }

  async 검색하기(도메인: string): Promise<void> {
    await this.도메인칸.fill(도메인);
    await this.검색.click();
    await this.page.waitForURL(/by_domain=/);
    await this.page.waitForLoadState('load');
    await this.행(도메인).or(this.비어있음).first().waitFor();
  }

  async 지우기(도메인: string): Promise<void> {
    await this.열기();
    if ((await this.행(도메인).count()) === 0) return;
    await this.행(도메인).getByRole('checkbox').check();
    const 받기 = (창: { accept: () => Promise<void> }): void => void 창.accept();
    this.page.on('dialog', 받기);
    try {
      await this.삭제하기.click();
      await this.page.waitForLoadState('load');
      await this.제목.waitFor();
    } finally {
      this.page.off('dialog', 받기);
    }
  }
}
