import type { Locator, Page } from '@playwright/test';

export class 로그인화면 {
  static readonly 주소 = '/login';

  readonly 제목: Locator;
  readonly 아이디: Locator;
  readonly 비밀번호: Locator;
  readonly 상태유지: Locator;
  readonly 로그인: Locator;
  readonly 오류: Locator;

  constructor(readonly page: Page) {
    const 본문 = page.getByRole('main');
    this.제목 = 본문.getByRole('heading', { name: '로그인', level: 1 });
    this.아이디 = 본문.getByLabel('아이디', { exact: true });
    this.비밀번호 = 본문.getByLabel('비밀번호', { exact: true });
    this.상태유지 = 본문.getByRole('checkbox', { name: '로그인 상태 유지' });
    this.로그인 = 본문.getByRole('button', { name: '로그인', exact: true });
    this.오류 = 본문.getByRole('alert');
  }

  async 열기(): Promise<void> {
    await this.page.goto(로그인화면.주소);
  }

  async 적기(칸: Locator, 글: string): Promise<void> {
    await 칸.fill(글);
  }

  async 아이디와비밀번호적기(아이디: string, 비밀번호: string): Promise<void> {
    await this.아이디.fill(아이디);
    await this.비밀번호.fill(비밀번호);
  }
}
