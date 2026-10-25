import type { Locator, Page } from '@playwright/test';

import { 머리글 } from '../components/header.component.js';
import { 두프레임기다리기 } from '../helpers/common-tools.helper.js';

export class 비밀번호찾기화면 {
  static readonly 주소 = '/find-password';

  readonly 머리: 머리글;
  readonly 큰제목: Locator;
  readonly 아이디: Locator;
  readonly 이메일: Locator;
  readonly 임시비밀번호받기: Locator;
  readonly 결과: Locator;
  readonly 로그인으로돌아가기: Locator;
  readonly 보냄안내: Locator;
  readonly 없음안내: Locator;

  constructor(private readonly page: Page) {
    this.머리 = new 머리글(page);
    this.큰제목 = page.getByRole('heading', { level: 1, name: '비밀번호 찾기', exact: true });
    this.아이디 = page.getByLabel('아이디', { exact: true });
    this.이메일 = page.getByLabel('이메일', { exact: true });
    this.임시비밀번호받기 = page.getByRole('button', { name: /^(임시 비밀번호 받기|처리 중)$/ });
    this.결과 = page.getByRole('alert');
    this.로그인으로돌아가기 = page.getByRole('link', { name: '로그인으로 돌아가기', exact: true });
    this.보냄안내 = page.getByText('가입하신 이메일로 임시 비밀번호를 보냈습니다', { exact: true });
    this.없음안내 = page.getByText('일치하는 회원 정보가 없습니다', { exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto(비밀번호찾기화면.주소);
    await this.그려질때까지();
  }

  async 그려질때까지(): Promise<void> {
    await this.큰제목.waitFor();
    await this.머리.그려질때까지();
  }

  async 받기(아이디: string, 이메일: string): Promise<void> {
    await this.아이디.fill(아이디);
    await this.이메일.fill(이메일);
    await this.누르기();
  }

  async 누르기(): Promise<void> {
    const 응답 = this.page.waitForResponse((r) => r.url().includes('/api/auth/find-password'));
    await this.임시비밀번호받기.click();
    await 응답;
    await 두프레임기다리기(this.page);
  }
}
