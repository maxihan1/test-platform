import type { Locator, Page } from '@playwright/test';

export class 사이드바 {
  readonly 영역: Locator;
  readonly 중재: Locator;
  readonly 관리: Locator;
  readonly 추천과유행: Locator;

  constructor(page: Page) {
    this.영역 = page.locator('.sidebar nav, nav.sidebar__nav, .sidebar-wrapper nav').first();
    this.중재 = this.영역.getByRole('link', { name: '중재', exact: true });
    this.관리 = this.영역.getByRole('link', { name: '관리', exact: true });
    this.추천과유행 = this.영역.getByRole('link', { name: '추천과 유행', exact: true });
  }

  메뉴(이름: string): Locator {
    return this.영역.getByRole('link', { name: 이름, exact: true });
  }

  async 그려질때까지(): Promise<void> {
    await this.영역.waitFor();
  }
}
