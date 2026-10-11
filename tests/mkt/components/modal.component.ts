import type { Locator, Page } from '@playwright/test';

export class 모달 {
  readonly 배경: Locator;
  readonly 창: Locator;
  readonly 제목: Locator;
  readonly 본문: Locator;
  readonly 닫기X: Locator;

  constructor(readonly page: Page) {
    this.배경 = page.locator('.modal-backdrop');
    this.창 = page.getByRole('dialog');
    this.제목 = this.창.getByRole('heading', { level: 2 });
    this.본문 = this.창.locator('.modal-body');
    this.닫기X = this.창.getByRole('button', { name: '닫기' }).and(page.locator('.modal-x'));
  }

  버튼(이름: string): Locator {
    return this.창.locator('.modal-foot').getByRole('button', { name: 이름, exact: true });
  }
}
