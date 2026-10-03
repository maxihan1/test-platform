import type { Locator, Page } from '@playwright/test';

export class 약관모달보조 {
  constructor(private readonly page: Page) {}

  제목(): Locator {
    return this.page.getByRole('heading', { name: '회원가입', level: 1, exact: true });
  }

  async 본문스크롤상태(): Promise<string> {
    return this.page.locator('body').evaluate((본문) => getComputedStyle(본문).overflow);
  }

  async 초점이있는가(대상: Locator): Promise<boolean> {
    return 대상.evaluate((요소) => 요소 === document.activeElement);
  }
}
