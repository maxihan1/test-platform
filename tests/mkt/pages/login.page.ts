import type { Locator, Page } from '@playwright/test';

export class 로그인화면 {
  constructor(private readonly page: Page) {}

  get 아이디(): Locator {
    return this.page.getByLabel('아이디');
  }

  get 비밀번호(): Locator {
    return this.page.getByLabel('비밀번호');
  }

  get 로그인유지(): Locator {
    return this.page.getByLabel('로그인 상태 유지');
  }

  get 로그인버튼(): Locator {
    return this.page.getByRole('main').getByRole('button', { name: '로그인', exact: true });
  }

  get 오류문구(): Locator {
    return this.page.locator('.login-error');
  }

  get 회원가입링크(): Locator {
    return this.page.getByRole('main').getByRole('link', { name: '회원가입', exact: true });
  }

  get 입력칸들(): Locator {
    return this.page.getByRole('main').locator('input');
  }

  get 로그아웃확인문구(): Locator {
    return this.page.getByRole('dialog', { name: '확인' }).getByText('로그아웃 하시겠습니까?');
  }

  async 열기(): Promise<void> {
    await this.page.goto('/login');
    await this.로그인버튼.waitFor();
  }

  async 입력한다(아이디: string, 비밀번호: string): Promise<void> {
    await this.아이디.fill(아이디);
    await this.비밀번호.fill(비밀번호);
  }

  async 이름표없는입력칸수(): Promise<number> {
    return this.입력칸들.evaluateAll(
      (칸들) => 칸들.filter((칸) => (칸 as HTMLInputElement).labels?.length === 0).length,
    );
  }

  async 탭으로옮긴다(대상: Locator, 최대횟수 = 12): Promise<void> {
    await this.아이디.focus();
    for (let 번 = 0; 번 < 최대횟수; 번 += 1) {
      if (await 대상.evaluate((요소) => 요소 === document.activeElement)) return;
      await this.page.keyboard.press('Tab');
    }
  }

  async 초점이있나(대상: Locator): Promise<boolean> {
    return 대상.evaluate((요소) => 요소 === document.activeElement);
  }

  async 로그인쿠키만료(): Promise<number | undefined> {
    const 쿠키들 = await this.page.context().cookies();
    return 쿠키들.find((쿠키) => 쿠키.name === 'dm_sid')?.expires;
  }

  async 본문넘침(): Promise<string> {
    return this.page.evaluate(() => getComputedStyle(document.body).overflow);
  }

  async 본문글자(): Promise<string> {
    return this.page.locator('body').innerText();
  }
}
