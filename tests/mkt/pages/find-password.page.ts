import type { Locator, Page } from '@playwright/test';
import { 머리글 } from '../components/header.component.js';

export class 비밀번호찾기화면 {
  static readonly 주소 = '/find-password';
  readonly 제목: Locator;
  readonly 아이디: Locator;
  readonly 이메일: Locator;
  readonly 결과: Locator;
  readonly 받기버튼: Locator;
  readonly 돌아가기링크: Locator;
  readonly 머리글: 머리글;

  constructor(readonly page: Page) {
    const 본문 = page.locator('main');
    this.제목 = page.getByRole('heading', { name: '비밀번호 찾기', level: 1 });
    this.아이디 = 본문.getByLabel('아이디');
    this.이메일 = 본문.getByLabel('이메일');
    this.결과 = 본문.getByRole('alert');
    this.받기버튼 = 본문.getByRole('button', { name: '임시 비밀번호 받기' });
    this.돌아가기링크 = 본문.getByRole('link', { name: '로그인으로 돌아가기' });
    this.머리글 = new 머리글(page);
  }

  async 열기(): Promise<void> {
    await this.page.goto(비밀번호찾기화면.주소);
    await this.제목.waitFor();
    await this.머리글.그려질때까지();
  }

  async 채우기(아이디: string, 이메일: string): Promise<void> {
    await this.아이디.fill(아이디);
    await this.이메일.fill(이메일);
  }

  async 받기누르기(): Promise<void> {
    await this.받기버튼.click();
    await this.받기버튼.waitFor();
  }
}
