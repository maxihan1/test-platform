import type { Locator, Page } from '@playwright/test';

import { 머리글 } from '../components/header.component.js';

export class 로그인화면 {
  readonly 제목: Locator;
  readonly 머리글: 머리글;
  readonly 아이디칸: Locator;
  readonly 비밀번호칸: Locator;
  readonly 로그인버튼: Locator;
  readonly 로딩표시: Locator;
  readonly 회원가입링크: Locator;
  readonly 오류문구: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '로그인', level: 1 });
    this.머리글 = new 머리글(page);
    this.아이디칸 = page.getByRole('textbox', { name: '아이디', exact: true });
    this.비밀번호칸 = page.getByLabel('비밀번호', { exact: true });
    this.로그인버튼 = page.getByRole('main').locator('button[type=submit]');
    this.로딩표시 = this.로그인버튼.getByLabel('처리 중');
    this.회원가입링크 = page.getByRole('main').getByRole('link', { name: '회원가입', exact: true });
    this.오류문구 = page.getByRole('main').getByRole('alert');
  }

  async 열기(다음?: string): Promise<void> {
    await this.page.goto(다음 === undefined ? '/login' : `/login?next=${encodeURIComponent(다음)}`);
    await this.제목.waitFor();
    await this.로그인버튼.waitFor();
    await this.머리글.로고.waitFor();
  }

  async 열릴때까지기다리기(): Promise<void> {
    await this.제목.waitFor();
    await this.머리글.로고.waitFor();
  }

  async 적기(아이디: string, 비밀번호: string): Promise<void> {
    await this.아이디칸.fill(아이디);
    await this.비밀번호칸.fill(비밀번호);
  }

  async 로그인하기(아이디: string, 비밀번호: string): Promise<void> {
    await this.적기(아이디, 비밀번호);
    await this.로그인버튼.click();
  }

  async 초점이비밀번호칸에있나(): Promise<boolean> {
    return this.비밀번호칸.evaluate((el) => el === document.activeElement);
  }

  async 주소의다음값(): Promise<string | null> {
    return new URL(this.page.url()).searchParams.get('next');
  }
}
