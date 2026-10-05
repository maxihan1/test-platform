import type { Locator, Page } from '@playwright/test';

export class 비밀번호재설정화면 {
  readonly 제목: Locator;
  readonly 이름칸: Locator;
  readonly 이메일칸: Locator;
  readonly 발송버튼: Locator;
  readonly 취소링크: Locator;
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
    this.제목 = page.getByRole('heading', { name: '비밀번호 재설정' });
    this.이름칸 = page.getByPlaceholder('이름 입력');
    this.이메일칸 = page.getByPlaceholder('이메일 입력');
    this.발송버튼 = page.getByRole('button', { name: '인증 메일 발송' });
    this.취소링크 = page.getByRole('link', { name: '취소하기' });
  }

  async 연다(): Promise<void> {
    await this.page.goto('/pwd/PwdSch');
  }
}
