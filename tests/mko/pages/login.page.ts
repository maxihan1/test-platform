import type { Locator, Page } from '@playwright/test';

export class 로그인화면 {
  static readonly 주소 = '/login';

  readonly 머리글: Locator;
  readonly 아이디칸: Locator;
  readonly 비밀번호칸: Locator;
  readonly 로그인버튼: Locator;

  constructor(readonly page: Page) {
    this.머리글 = page.getByRole('heading', { name: '로그인', level: 1 });
    this.아이디칸 = page.getByRole('textbox', { name: '아이디' });
    this.비밀번호칸 = page.getByRole('textbox', { name: '비밀번호' });
    this.로그인버튼 = page.getByRole('button', { name: '로그인', exact: true });
  }

  async 로그인(아이디: string, 비밀번호: string): Promise<void> {
    await this.아이디칸.fill(아이디);
    await this.비밀번호칸.fill(비밀번호);
    await this.로그인버튼.click();
  }
}
