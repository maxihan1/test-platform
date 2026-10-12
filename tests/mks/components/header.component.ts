import type { Locator, Page } from '@playwright/test';

export class 머리글 {
  readonly 영역: Locator;
  readonly 로그인: Locator;
  readonly 회원가입: Locator;
  readonly 마이페이지: Locator;
  readonly 로그아웃: Locator;

  constructor(readonly page: Page) {
    this.영역 = page.getByRole('banner');
    this.로그인 = this.영역.getByRole('link', { name: '로그인', exact: true });
    this.회원가입 = this.영역.getByRole('link', { name: '회원가입', exact: true });
    this.마이페이지 = this.영역.getByRole('link', { name: '마이페이지', exact: true });
    this.로그아웃 = this.영역.getByRole('button', { name: '로그아웃', exact: true });
  }
}
