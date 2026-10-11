import type { Locator, Page } from '@playwright/test';

export class 모달 {
  readonly 창: Locator;
  readonly 제목: Locator;
  readonly 본문: Locator;
  readonly 닫기X: Locator;
  readonly 바깥: Locator;

  constructor(page: Page) {
    this.창 = page.locator('.modal[role=dialog]');
    this.제목 = this.창.locator('.modal-head h2');
    this.본문 = this.창.locator('.modal-body');
    this.닫기X = this.창.getByRole('button', { name: '닫기' }).and(this.창.locator('.modal-x'));
    this.바깥 = page.locator('.modal-backdrop');
  }

  버튼(이름: string): Locator {
    return this.창.locator('.modal-foot').getByRole('button', { name: 이름, exact: true });
  }
}
