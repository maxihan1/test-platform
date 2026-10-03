import type { Locator, Page } from '@playwright/test';

export class 로그인키보드화면 {
  constructor(private readonly page: Page) {}

  제목(): Locator {
    return this.page.getByRole('heading', { name: '로그인', level: 1, exact: true });
  }

  본문회원가입링크(): Locator {
    return this.page.getByRole('main').getByRole('link', { name: '회원가입', exact: true });
  }

  가입화면제목(): Locator {
    return this.page.getByRole('heading', { name: '회원가입', level: 1, exact: true });
  }

  async 탭으로초점옮기기(대상: Locator, 최대횟수: number): Promise<number> {
    for (let 횟수 = 0; 횟수 < 최대횟수; 횟수 += 1) {
      if (await 대상.evaluate((요소) => 요소 === document.activeElement)) return 횟수;
      await this.page.keyboard.press('Tab');
    }
    return 최대횟수;
  }

  async 초점이있는가(대상: Locator): Promise<boolean> {
    return 대상.evaluate((요소) => 요소 === document.activeElement);
  }

  async 엔터치기(): Promise<void> {
    await this.page.keyboard.press('Enter');
  }
}
