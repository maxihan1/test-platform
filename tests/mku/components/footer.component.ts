import type { Locator, Page } from '@playwright/test';

export class 바닥글 {
  readonly 영역: Locator;
  readonly 이용약관: Locator;
  readonly 개인정보처리방침: Locator;
  readonly 저작권: Locator;
  readonly 맨위로: Locator;

  constructor(readonly page: Page) {
    this.영역 = page.locator('#site-footer');
    this.이용약관 = this.영역.getByRole('link', { name: '이용약관' });
    this.개인정보처리방침 = this.영역.getByRole('link', { name: '개인정보처리방침' });
    this.저작권 = this.영역.getByText('© 2026 DemoMarket');
    this.맨위로 = page.getByRole('button', { name: '맨 위로' });
  }
}
