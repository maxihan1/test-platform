import type { Locator, Page } from '@playwright/test';

import { 알림 } from '../components/flash.component.js';

export class IP규칙목록화면 {
  static readonly 주소 = '/admin/ip_blocks';

  readonly 제목: Locator;
  readonly 알림: 알림;
  readonly 규칙만들기: Locator;
  readonly 검색칸: Locator;
  readonly 검색: Locator;
  readonly 초기화: Locator;
  readonly 삭제: Locator;
  readonly 비어있음: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: 'IP 규칙들', level: 1 });
    this.알림 = new 알림(page);
    this.규칙만들기 = page.getByRole('link', { name: '규칙 만들기' });
    this.검색칸 = page.getByPlaceholder('192.0.2.0/24');
    this.검색 = page.getByRole('button', { name: '검색' });
    this.초기화 = page.getByRole('link', { name: '초기화' });
    this.삭제 = page.getByRole('button', { name: '삭제', exact: true });
    this.비어있음 = page.getByText('아무 것도 없습니다!');
  }

  async 열기(): Promise<number> {
    const 응답 = await this.page.goto(IP규칙목록화면.주소);
    await this.page.getByRole('heading', { level: 1 }).first().waitFor();
    return 응답?.status() ?? 0;
  }

  행(아이피: string): Locator {
    return this.page.locator('.batch-table__row').filter({ hasText: `${아이피}/32` });
  }

  async 검색하기(아이피: string): Promise<void> {
    await this.검색칸.fill(아이피);
    await this.검색.click();
    await this.page.waitForURL(/ip=/);
    await this.page.waitForLoadState('load');
    await this.행(아이피).or(this.비어있음).first().waitFor();
  }

  async 지우기(아이피: string): Promise<void> {
    await this.열기();
    if ((await this.행(아이피).count()) === 0) return;
    await this.행(아이피).getByRole('checkbox').check();
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
