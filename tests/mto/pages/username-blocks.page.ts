import type { Locator, Page } from '@playwright/test';

import { 알림 } from '../components/flash.component.js';

export class 사용자명규칙목록화면 {
  static readonly 주소 = '/admin/username_blocks';

  readonly 제목: Locator;
  readonly 알림: 알림;
  readonly 새로추가: Locator;
  readonly 삭제: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '사용자명 규칙', level: 1 });
    this.알림 = new 알림(page);
    this.새로추가 = page.getByRole('link', { name: '새로 추가', exact: true });
    this.삭제 = page.getByRole('button', { name: '삭제', exact: true });
  }

  async 열기(): Promise<number> {
    const 응답 = await this.page.goto(사용자명규칙목록화면.주소);
    await this.page.getByRole('heading', { level: 1 }).first().waitFor();
    return 응답?.status() ?? 0;
  }

  행(단어: string): Locator {
    return this.page.locator('.batch-table__row').filter({ has: this.page.getByRole('link', { name: 단어, exact: true }) });
  }

  행에글(단어: string, 글: string): Locator {
    return this.행(단어).filter({ hasText: 글 });
  }

  규칙링크(단어: string): Locator {
    return this.page.getByRole('link', { name: 단어, exact: true });
  }

  async 지우기(단어: string): Promise<void> {
    await this.열기();
    if ((await this.행(단어).count()) === 0) return;
    await this.page.getByRole('checkbox', { name: 단어, exact: true }).check();
    const 받기 = (창: { accept: () => Promise<void> }): void => void 창.accept();
    this.page.on('dialog', 받기);
    try {
      await this.삭제.click();
      await this.page.waitForLoadState('load');
      await this.제목.waitFor();
    } finally {
      this.page.off('dialog', 받기);
    }
  }
}
