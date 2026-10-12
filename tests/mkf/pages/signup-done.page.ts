import type { Locator, Page } from '@playwright/test';

export class 가입완료화면 {
  static readonly 주소 = '/signup/done';

  readonly 환영: Locator;
  readonly 안내: Locator;
  readonly 로그인하러가기: Locator;

  constructor(readonly page: Page) {
    this.환영 = page.getByRole('main').getByRole('heading', { level: 1 });
    this.안내 = page.getByRole('main').getByText('데모마켓 회원이 되신 것을 축하합니다.');
    this.로그인하러가기 = page.getByRole('main').getByRole('link', { name: '로그인하러 가기' });
  }

  async 열기(이름?: string): Promise<void> {
    await this.page.goto(이름 === undefined ? 가입완료화면.주소 : `${가입완료화면.주소}?name=${encodeURIComponent(이름)}`);
  }
}
