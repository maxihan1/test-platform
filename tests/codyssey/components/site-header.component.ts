import type { Locator, Page } from '@playwright/test';

export class 머리글 {
  readonly 영역: Locator;
  readonly 로그인링크: Locator;
  readonly 회원가입링크: Locator;
  readonly 지역버튼: Locator;
  readonly 전체메뉴버튼: Locator;

  constructor(page: Page) {
    this.영역 = page.getByRole('banner');
    this.로그인링크 = this.영역.getByRole('link', { name: '로그인', exact: true });
    this.회원가입링크 = this.영역.getByRole('link', { name: '회원가입', exact: true });
    this.지역버튼 = this.영역.getByRole('button', { name: '서울', exact: true });
    this.전체메뉴버튼 = page.getByRole('button', { name: '전체메뉴' });
  }

  메뉴(이름: string): Locator {
    return this.영역.getByRole('navigation').getByRole('link', { name: 이름, exact: true });
  }
}
