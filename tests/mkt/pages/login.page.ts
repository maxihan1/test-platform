import type { Locator, Page } from '@playwright/test';

export class 로그인화면 {
  readonly 제목: Locator;
  readonly 아이디칸: Locator;
  readonly 비밀번호칸: Locator;
  readonly 유지체크: Locator;
  readonly 로그인버튼: Locator;
  readonly 오류문구: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '로그인', level: 1 });
    this.아이디칸 = page.getByLabel('아이디', { exact: true });
    this.비밀번호칸 = page.getByLabel('비밀번호', { exact: true });
    this.유지체크 = page.getByRole('checkbox', { name: '로그인 상태 유지' });
    this.로그인버튼 = page.getByRole('main').getByRole('button', { name: '로그인', exact: true });
    this.오류문구 = page.getByRole('main').getByRole('alert');
  }

  async 열기(): Promise<void> {
    await this.page.goto('/login');
    await this.제목.waitFor();
    await this.로그인버튼.waitFor();
  }

  async 적기(아이디: string, 비밀번호: string): Promise<void> {
    await this.아이디칸.fill(아이디);
    await this.비밀번호칸.fill(비밀번호);
  }

  async 로그인하기(아이디: string, 비밀번호: string, 유지 = false): Promise<void> {
    await this.적기(아이디, 비밀번호);
    if (유지) await this.유지체크.check();
    await this.로그인버튼.click();
  }

  async 오류문구기다리기(): Promise<void> {
    await this.오류문구.filter({ hasText: /\S/ }).waitFor();
  }
}
