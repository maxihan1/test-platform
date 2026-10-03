import type { Locator, Page } from '@playwright/test';

export class 로그인화면 {
  constructor(private readonly page: Page) {}

  async 열기(다음?: string): Promise<void> {
    await this.page.goto(다음 === undefined ? '/login' : `/login?next=${encodeURIComponent(다음)}`);
  }

  아이디칸(): Locator {
    return this.page.getByLabel('아이디', { exact: true });
  }

  비밀번호칸(): Locator {
    return this.page.getByLabel('비밀번호', { exact: true });
  }

  로그인유지체크(): Locator {
    return this.page.getByRole('checkbox', { name: '로그인 상태 유지' });
  }

  로그인버튼(): Locator {
    return this.page.getByRole('button', { name: '로그인', exact: true });
  }

  오류문구(): Locator {
    return this.page.getByRole('alert');
  }

  async 로그인하기(아이디: string, 비밀번호: string): Promise<void> {
    await this.아이디칸().fill(아이디);
    await this.비밀번호칸().fill(비밀번호);
    await this.로그인버튼().click();
  }

  async 엔터로로그인하기(아이디: string, 비밀번호: string): Promise<void> {
    await this.아이디칸().fill(아이디);
    await this.비밀번호칸().fill(비밀번호);
    await this.비밀번호칸().press('Enter');
  }

  async 로그인유지하고로그인하기(아이디: string, 비밀번호: string): Promise<void> {
    await this.아이디칸().fill(아이디);
    await this.비밀번호칸().fill(비밀번호);
    await this.로그인유지체크().check();
    await this.로그인버튼().click();
  }
}
