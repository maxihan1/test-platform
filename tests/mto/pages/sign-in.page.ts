import type { Locator, Page } from '@playwright/test';

export class 로그인화면 {
  static readonly 주소 = '/auth/sign_in';

  readonly 이메일: Locator;
  readonly 암호: Locator;
  readonly 로그인버튼: Locator;

  constructor(private readonly page: Page) {
    this.이메일 = page.getByRole('textbox', { name: '이메일 주소' });
    this.암호 = page.getByRole('textbox', { name: '암호', exact: true });
    this.로그인버튼 = page.getByRole('button', { name: '로그인', exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto(로그인화면.주소);
  }

  로그인화면인가(): boolean {
    return new URL(this.page.url()).pathname.startsWith(로그인화면.주소);
  }

  async 로그인(아이디: string, 비밀번호: string): Promise<void> {
    await this.이메일.fill(아이디);
    await this.암호.fill(비밀번호);
    const 응답 = this.page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === 로그인화면.주소);
    await this.로그인버튼.click();
    const 상태 = (await 응답).status();
    if (상태 === 429) throw new Error('로그인 한도 — 서버가 로그인 요청을 429(요청 횟수 제한)로 막았다');
    await this.page.waitForURL((u) => !u.pathname.startsWith(로그인화면.주소));
  }
}
