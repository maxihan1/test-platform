import type { Locator, Page } from '@playwright/test';

export class 로그인화면 {
  static readonly 주소 = '/login';

  readonly 제목: Locator;
  readonly 아이디: Locator;
  readonly 비밀번호: Locator;
  readonly 로그인버튼: Locator;

  constructor(page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { level: 1 });
    this.아이디 = page.getByRole('textbox', { name: '아이디' });
    this.비밀번호 = page.getByRole('textbox', { name: '비밀번호' });
    this.로그인버튼 = page.getByRole('main').getByRole('button', { name: '로그인', exact: true });
  }

  async 그려질때까지(): Promise<void> {
    await this.아이디.waitFor();
  }

  async 제목글자(): Promise<string> {
    return (await this.제목.innerText()).trim();
  }

  async 로그인하기(아이디: string, 비밀번호: string): Promise<void> {
    await this.아이디.fill(아이디);
    await this.비밀번호.fill(비밀번호);
    await this.로그인버튼.click();
  }
}
