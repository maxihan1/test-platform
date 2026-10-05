import type { Locator, Page } from '@playwright/test';

export class 비밀번호찾기화면 {
  readonly 제목: Locator;
  readonly 아이디칸: Locator;
  readonly 이메일칸: Locator;
  readonly 받기버튼: Locator;
  readonly 결과문구: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '비밀번호 찾기', level: 1 });
    this.아이디칸 = page.getByLabel('아이디', { exact: true });
    this.이메일칸 = page.getByLabel('이메일', { exact: true });
    this.받기버튼 = page.getByRole('button', { name: '임시 비밀번호 받기', exact: true });
    this.결과문구 = page.getByRole('main').getByRole('alert');
  }

  async 열기(): Promise<void> {
    await this.page.goto('/find-password');
    await this.제목.waitFor();
    await this.받기버튼.waitFor();
  }

  async 요청하기(아이디: string, 이메일: string): Promise<void> {
    await this.아이디칸.fill(아이디);
    await this.이메일칸.fill(이메일);
    await this.받기버튼.click();
    await this.결과문구.filter({ hasText: /\S/ }).waitFor();
  }
}
