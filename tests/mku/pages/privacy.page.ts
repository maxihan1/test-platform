import type { Locator, Page } from '@playwright/test';

export class 개인정보처리방침화면 {
  static readonly 주소 = '/privacy';

  readonly 제목: Locator;
  readonly 본문: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { level: 1 });
    this.본문 = page.getByRole('main').getByRole('article');
  }

  async 열기(): Promise<void> {
    await this.page.goto(개인정보처리방침화면.주소);
  }

  async 조문제목들(): Promise<string[]> {
    const 글 = await this.본문.innerText();
    return 글.split('\n').map((줄) => 줄.trim()).filter((줄) => /^제\d+조 \(.+\)$/.test(줄));
  }

  async 끝문구(): Promise<string> {
    const 줄들 = (await this.본문.innerText()).split('\n').map((줄) => 줄.trim()).filter((줄) => 줄 !== '');
    return 줄들.slice(-2).join(' ');
  }
}
