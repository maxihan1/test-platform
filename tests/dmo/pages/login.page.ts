import type { Locator, Page } from '@playwright/test';

export class 로그인화면 {
  static readonly 주소 = '/login';
  readonly 제목: Locator;
  readonly 아이디칸: Locator;
  readonly 비밀번호칸: Locator;
  readonly 로그인버튼: Locator;
  readonly 오류안내: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '로그인', exact: true });
    this.아이디칸 = page.getByLabel('아이디', { exact: true });
    this.비밀번호칸 = page.getByLabel('비밀번호', { exact: true });
    this.로그인버튼 = page.getByRole('button', { name: '로그인', exact: true });
    this.오류안내 = page.locator('.login-error');
  }

  async 열기(): Promise<void> {
    await this.page.goto(로그인화면.주소);
    await this.아이디칸.waitFor();
  }
}
