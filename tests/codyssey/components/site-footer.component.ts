import type { Locator, Page } from '@playwright/test';

export class 바닥글 {
  readonly 영역: Locator;
  readonly 이용약관링크: Locator;
  readonly 개인정보처리방침링크: Locator;
  readonly 패밀리사이트버튼: Locator;
  readonly 언어버튼: Locator;

  constructor(page: Page) {
    this.영역 = page.getByRole('contentinfo');
    this.이용약관링크 = this.영역.getByRole('link', { name: '이용약관', exact: true });
    this.개인정보처리방침링크 = this.영역.getByRole('link', { name: '개인정보처리방침', exact: true });
    this.패밀리사이트버튼 = this.영역.getByRole('button', { name: 'Family Site' });
    this.언어버튼 = this.영역.getByRole('button', { name: '한국어' });
  }
}
