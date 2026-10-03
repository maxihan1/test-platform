import type { Locator, Page } from '@playwright/test';

import { 머리글부품 } from '../components/header.component.js';

export class 로그아웃홈 {
  readonly 교육과정신청버튼: Locator;
  readonly 머리글회원가입링크: Locator;
  readonly 머리글로그인링크: Locator;

  constructor(private readonly page: Page) {
    const 머리글 = new 머리글부품(page);
    this.교육과정신청버튼 = page.getByRole('button', { name: '교육과정 신청하기' });
    this.머리글회원가입링크 = 머리글.메뉴('회원가입');
    this.머리글로그인링크 = 머리글.메뉴('로그인');
  }

  async 열기(): Promise<void> {
    await this.page.goto('/');
  }
}
