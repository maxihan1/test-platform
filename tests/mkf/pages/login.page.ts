import type { Locator, Page } from '@playwright/test';

export class 로그인화면 {
  static readonly 주소 = '/login';

  readonly 제목: Locator;
  readonly 폼: Locator;
  readonly 아이디: Locator;
  readonly 비밀번호: Locator;
  readonly 상태유지: Locator;
  readonly 로그인: Locator;
  readonly 오류: Locator;
  readonly 회원가입: Locator;
  readonly 비밀번호찾기: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { name: '로그인', level: 1 });
    this.폼 = page.locator('form.login-form');
    this.아이디 = this.폼.getByLabel('아이디', { exact: true });
    this.비밀번호 = this.폼.getByLabel('비밀번호', { exact: true });
    this.상태유지 = this.폼.getByRole('checkbox', { name: '로그인 상태 유지' });
    this.로그인 = this.폼.getByRole('button', { name: '로그인' });
    this.오류 = this.폼.getByRole('alert');
    this.회원가입 = page.getByRole('main').getByRole('link', { name: '회원가입' });
    this.비밀번호찾기 = page.getByRole('main').getByRole('link', { name: '비밀번호 찾기' });
  }

  async 열기(돌아갈주소?: string): Promise<void> {
    await this.page.goto(돌아갈주소 === undefined ? 로그인화면.주소 : `${로그인화면.주소}?next=${encodeURIComponent(돌아갈주소)}`);
  }

  async 로그인하기(아이디: string, 비밀번호: string): Promise<void> {
    await this.아이디.fill(아이디);
    await this.비밀번호.fill(비밀번호);
    await this.로그인.click();
  }

  async 틀리게로그인하고오류기다리기(아이디: string, 비밀번호: string): Promise<void> {
    await this.로그인하기(아이디, 비밀번호);
    await this.오류.waitFor();
  }

  async 새로열어틀리게로그인하기(아이디: string, 비밀번호: string): Promise<void> {
    await this.열기();
    await this.제목.waitFor();
    await this.틀리게로그인하고오류기다리기(아이디, 비밀번호);
  }

  async 탭으로회원가입링크까지옮기기(최대횟수 = 40): Promise<boolean> {
    for (let i = 0; i < 최대횟수; i += 1) {
      await this.page.keyboard.press('Tab');
      const 글 = await this.page.evaluate(() => document.activeElement?.textContent?.trim() ?? '');
      if (글 === '회원가입') return true;
    }
    return false;
  }

  async 이름표없는입력칸수(): Promise<number> {
    return this.page.getByRole('main').locator('input').evaluateAll(
      (칸) => (칸 as HTMLInputElement[]).filter((c) => c.type !== 'hidden' && (c.labels === null || c.labels.length === 0) && !c.hasAttribute('aria-label')).length,
    );
  }
}
