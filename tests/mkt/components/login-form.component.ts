import type { Locator, Page } from '@playwright/test';

export class 로그인폼 {
  constructor(private readonly page: Page) {}

  get 아이디(): Locator {
    return this.page.getByLabel('아이디');
  }

  get 비밀번호(): Locator {
    return this.page.getByLabel('비밀번호');
  }

  get 로그인유지(): Locator {
    return this.page.getByLabel('로그인 상태 유지');
  }

  get 로그인버튼(): Locator {
    return this.page.getByRole('main').getByRole('button', { name: '로그인', exact: true });
  }

  get 오류문구(): Locator {
    return this.page.locator('.login-error');
  }

  async 열기(다음?: string): Promise<void> {
    await this.page.goto(다음 === undefined ? '/login' : `/login?next=${encodeURIComponent(다음)}`);
    await this.로그인버튼.waitFor();
  }

  async 입력한다(아이디: string, 비밀번호: string): Promise<void> {
    await this.아이디.fill(아이디);
    await this.비밀번호.fill(비밀번호);
  }

  async 누른다(): Promise<void> {
    await this.로그인버튼.click();
  }

  async 로그인한다(아이디: string, 비밀번호: string): Promise<void> {
    await this.열기();
    await this.입력한다(아이디, 비밀번호);
    await this.누른다();
    await this.page.getByRole('banner').getByRole('button', { name: '로그아웃', exact: true }).waitFor();
  }
}
