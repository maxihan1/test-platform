import type { Locator, Page } from '@playwright/test';

export class 쿠키안내 {
  readonly 띠: Locator;
  readonly 문구: Locator;
  readonly 동의: Locator;

  constructor(page: Page) {
    this.띠 = page.getByRole('region', { name: '쿠키 안내' });
    this.문구 = this.띠.getByText('서비스 개선을 위해 쿠키를 사용합니다.', { exact: true });
    this.동의 = this.띠.getByRole('button', { name: '동의', exact: true });
  }
}
