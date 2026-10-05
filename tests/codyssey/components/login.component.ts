import type { Locator, Page } from '@playwright/test';

export class 로그인상자 {
  readonly page: Page;
  readonly 이메일칸: Locator;
  readonly 비밀번호칸: Locator;
  readonly 로그인버튼: Locator;
  readonly 로그인뒤표시: Locator;

  constructor(page: Page) {
    this.page = page;
    this.이메일칸 = page.getByPlaceholder('이메일을 입력하세요.');
    this.비밀번호칸 = page.getByPlaceholder('비밀번호를 입력하세요.');
    this.로그인버튼 = page.getByRole('button', { name: '로그인', exact: true });
    this.로그인뒤표시 = page.getByText('Journey Start!');
  }

  async 연다(): Promise<void> {
    await this.page.goto('/loginForm');
  }

  async 적고누른다(이메일: string, 비밀번호: string): Promise<void> {
    await this.이메일칸.fill(이메일);
    await this.비밀번호칸.fill(비밀번호);
    await this.로그인버튼.click();
  }

  async 로그인한다(이메일: string, 비밀번호: string): Promise<void> {
    await this.연다();
    await this.적고누른다(이메일, 비밀번호);
  }
}
