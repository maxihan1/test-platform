import type { Locator, Page } from '@playwright/test';

export class 로그인부품 {
  readonly 이메일칸: Locator;
  readonly 비밀번호칸: Locator;
  readonly 로그인버튼: Locator;

  constructor(private readonly page: Page) {
    this.이메일칸 = page.getByPlaceholder('이메일을 입력하세요.');
    this.비밀번호칸 = page.getByPlaceholder('비밀번호를 입력하세요.');
    this.로그인버튼 = page.getByRole('button', { name: '로그인', exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto('/loginForm');
  }

  async 계정적기(아이디: string, 비밀번호: string): Promise<void> {
    await this.이메일칸.fill(아이디);
    await this.비밀번호칸.fill(비밀번호);
  }

  async 로그인하기(아이디: string, 비밀번호: string): Promise<void> {
    await this.열기();
    await this.계정적기(아이디, 비밀번호);
    await this.로그인버튼.click();
  }
}
