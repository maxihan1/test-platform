import type { Locator, Page } from '@playwright/test';

import { 머리 } from '../components/header.component.js';

export class 개인정보처리방침화면 {
  private readonly 머리부: 머리;

  constructor(private readonly page: Page) {
    this.머리부 = new 머리(page);
  }

  get 현재위치(): Locator {
    return this.page.getByRole('main').getByRole('navigation', { name: '현재 위치' });
  }

  async 연다(): Promise<void> {
    await this.page.goto('/terms/privacy');
    await this.머리부.메뉴('알림마당').waitFor();
  }
}
