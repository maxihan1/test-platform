import type { Locator, Page } from '@playwright/test';

import { 오류화면 } from '../components/error-page.component.js';

export class 업데이트화면 {
  static readonly 주소 = '/admin/software_updates';

  readonly 제목: Locator;
  readonly 오류: 오류화면;
  readonly 버전칸: Locator;
  readonly 유형칸: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { level: 1 });
    this.오류 = new 오류화면(page);
    this.버전칸 = page.getByRole('columnheader', { name: '버전', exact: true });
    this.유형칸 = page.getByRole('columnheader', { name: '유형', exact: true });
  }

  async 열기(): Promise<number> {
    const 응답 = await this.page.goto(업데이트화면.주소);
    await this.제목.waitFor();
    return 응답?.status() ?? 0;
  }
}
