import type { Locator, Page } from '@playwright/test';

export class 폼오류 {
  readonly 요약: Locator;
  readonly 내용필요: Locator;

  constructor(page: Page) {
    this.요약 = page.getByText(/^오류가 발생했습니다/);
    this.내용필요 = page.getByText('내용을 입력해 주세요', { exact: true });
  }
}
