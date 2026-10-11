import type { Locator, Page } from '@playwright/test';

export class 바닥글 {
  readonly 틀: Locator;
  readonly 이용약관링크: Locator;
  readonly 개인정보링크: Locator;
  readonly 저작권문구: Locator;
  readonly 맨위로버튼: Locator;
  readonly 쿠키띠: Locator;
  readonly 쿠키동의버튼: Locator;

  constructor(page: Page) {
    this.틀 = page.locator('#site-footer');
    this.이용약관링크 = this.틀.getByRole('link', { name: '이용약관' });
    this.개인정보링크 = this.틀.getByRole('link', { name: '개인정보처리방침' });
    this.저작권문구 = this.틀.getByText('© 2026 DemoMarket');
    this.맨위로버튼 = page.getByRole('button', { name: '맨 위로' });
    this.쿠키띠 = page.getByRole('region', { name: '쿠키 안내' });
    this.쿠키동의버튼 = this.쿠키띠.getByRole('button', { name: '동의' });
  }
}
