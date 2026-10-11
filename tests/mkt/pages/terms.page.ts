import type { Locator, Page } from '@playwright/test';

export class 약관화면 {
  static readonly 주소 = '/terms';

  readonly 제목: Locator;
  readonly 본문: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { name: '이용약관', level: 1 });
    this.본문 = page.getByRole('main').getByRole('article');
  }

  async 열기(): Promise<void> {
    await this.page.goto(약관화면.주소);
  }

  async 줄들(): Promise<string[]> {
    const 글 = await this.본문.innerText();
    return 글
      .split('\n')
      .map((줄) => 줄.trim())
      .filter((줄) => 줄 !== '');
  }

  async 조제목들(): Promise<string[]> {
    return (await this.줄들()).filter((줄) => /^제\d+조 \(.+\)$/.test(줄));
  }

  async 끝글(): Promise<string> {
    return (await this.줄들()).slice(-2).join(' ');
  }
}
