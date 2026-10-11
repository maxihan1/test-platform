import type { Locator, Page } from '@playwright/test';

export class 비밀번호찾기화면 {
  static readonly 주소 = '/find-password';

  readonly 제목: Locator;
  readonly 아이디: Locator;
  readonly 이메일: Locator;
  readonly 받기: Locator;
  readonly 로딩표시: Locator;
  readonly 결과: Locator;
  readonly 로그인으로돌아가기: Locator;

  constructor(readonly page: Page) {
    const 본문 = page.getByRole('main');
    this.제목 = 본문.getByRole('heading', { name: '비밀번호 찾기', level: 1 });
    this.아이디 = 본문.getByLabel('아이디');
    this.이메일 = 본문.getByLabel('이메일');
    this.받기 = 본문.getByRole('button');
    this.로딩표시 = this.받기.getByLabel('처리 중');
    this.결과 = 본문.getByRole('alert');
    this.로그인으로돌아가기 = 본문.getByRole('link', { name: '로그인으로 돌아가기' });
  }

  async 열기(): Promise<void> {
    await this.page.goto(비밀번호찾기화면.주소);
  }

  async 적고받기(아이디: string, 이메일: string): Promise<void> {
    await this.아이디.fill(아이디);
    await this.이메일.fill(이메일);
    await this.받기.click();
  }
}
