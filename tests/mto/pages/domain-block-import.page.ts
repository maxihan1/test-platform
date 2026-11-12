import type { Locator, Page } from '@playwright/test';

import { 알림 } from '../components/flash.component.js';

export class 도메인차단불러오기화면 {
  static readonly 주소 = '/admin/export_domain_blocks/new';

  readonly 제목: Locator;
  readonly 알림: 알림;
  readonly 파일칸: Locator;
  readonly 업로드: Locator;
  readonly 불러오기: Locator;
  readonly 미리보기줄들: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '도메인 차단 불러오기', level: 1 });
    this.알림 = new 알림(page);
    this.파일칸 = page.getByLabel('데이터');
    this.업로드 = page.getByRole('button', { name: '업로드' });
    this.불러오기 = page.getByRole('button', { name: '불러오기' });
    this.미리보기줄들 = page.locator('.batch-table__row');
  }

  async 열기(): Promise<void> {
    await this.page.goto(도메인차단불러오기화면.주소);
    await this.제목.waitFor();
    await this.업로드.waitFor();
  }

  async 올리기(내용: string): Promise<void> {
    await this.파일칸.setInputFiles({ name: 'mto.csv', mimeType: 'text/csv', buffer: Buffer.from(내용) });
    await this.업로드.click();
    await this.page.waitForLoadState('load');
    await this.불러오기.waitFor();
  }
}
