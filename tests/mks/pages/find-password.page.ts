import type { Locator, Page } from '@playwright/test';

export class 비밀번호찾기화면 {
  static readonly 주소 = '/find-password';

  readonly 제목: Locator;
  readonly 아이디: Locator;
  readonly 이메일: Locator;
  readonly 받기: Locator;
  readonly 결과: Locator;

  constructor(readonly page: Page) {
    const 본문 = page.getByRole('main');
    this.제목 = 본문.getByRole('heading', { name: '비밀번호 찾기', level: 1 });
    this.아이디 = 본문.getByLabel('아이디', { exact: true });
    this.이메일 = 본문.getByLabel('이메일', { exact: true });
    this.받기 = 본문.getByRole('button', { name: '임시 비밀번호 받기' });
    this.결과 = 본문.getByRole('alert');
  }

  async 열기(): Promise<void> {
    await this.page.goto(비밀번호찾기화면.주소);
  }
}
