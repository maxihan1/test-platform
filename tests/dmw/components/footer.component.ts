import type { Locator, Page } from '@playwright/test';

export class 바닥글 {
  readonly 영역: Locator;
  readonly 이용약관: Locator;
  readonly 개인정보처리방침: Locator;
  readonly 저작권: Locator;
  readonly 맨위로: Locator;

  constructor(page: Page) {
    this.영역 = page.getByRole('contentinfo');
    this.이용약관 = this.영역.getByRole('link', { name: '이용약관', exact: true });
    this.개인정보처리방침 = this.영역.getByRole('link', { name: '개인정보처리방침', exact: true });
    this.저작권 = this.영역.getByText('© 2026 DemoMarket', { exact: true });
    this.맨위로 = page.getByRole('button', { name: '맨 위로', exact: true });
  }

  async 그려질때까지(): Promise<void> {
    await this.이용약관.waitFor();
  }
}
