import type { Locator, Page } from '@playwright/test';

export class 로그인화면 {
  static readonly 주소 = '/login';

  readonly page: Page;
  readonly 제목: Locator;
  readonly 아이디칸: Locator;
  readonly 비밀번호칸: Locator;
  readonly 로그인상태유지: Locator;
  readonly 로그인버튼: Locator;
  readonly 로딩표시: Locator;
  readonly 오류문구: Locator;
  readonly 회원가입링크: Locator;
  readonly 비밀번호찾기링크: Locator;

  constructor(page: Page) {
    this.page = page;
    const 본문 = page.getByRole('main');
    this.제목 = page.getByRole('heading', { name: '로그인', level: 1 });
    this.아이디칸 = page.getByLabel('아이디', { exact: true });
    this.비밀번호칸 = page.getByLabel('비밀번호', { exact: true });
    this.로그인상태유지 = page.getByRole('checkbox', { name: '로그인 상태 유지' });
    this.로그인버튼 = 본문.getByRole('button');
    this.로딩표시 = this.로그인버튼.getByLabel('처리 중');
    this.오류문구 = 본문.getByRole('alert');
    this.회원가입링크 = 본문.getByRole('link', { name: '회원가입' });
    this.비밀번호찾기링크 = 본문.getByRole('link', { name: '비밀번호 찾기' });
  }

  async 열기(): Promise<void> {
    await this.page.goto(로그인화면.주소);
    await this.제목.waitFor();
  }

  async 입력하기(아이디: string, 비밀번호: string): Promise<void> {
    await this.아이디칸.fill(아이디);
    await this.비밀번호칸.fill(비밀번호);
  }

  async 누르기(): Promise<void> {
    await this.로그인버튼.click();
  }

  async 응답받으며누르기(): Promise<number> {
    const [응답] = await Promise.all([
      this.page.waitForResponse((r) => r.url().includes('/api/auth/login') && r.request().method() === 'POST'),
      this.로그인버튼.click(),
    ]);
    return 응답.status();
  }

  async Tab으로회원가입링크까지가기(): Promise<void> {
    await this.아이디칸.focus();
    for (let 번 = 0; 번 < 12; 번 += 1) {
      if (await this.회원가입링크.evaluate((칸) => 칸 === document.activeElement)) return;
      await this.page.keyboard.press('Tab');
    }
    throw new Error('Tab 을 12번 쳐도 「회원가입」 링크에 닿지 못했다');
  }
}
