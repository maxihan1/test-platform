import type { Locator, Page } from '@playwright/test';

import { 머리글 } from '../components/header.component.js';
import { 화면제목 } from '../components/page-heading.component.js';

export class 이용약관화면 {
  static readonly 주소 = '/terms';

  readonly 머리: 머리글;
  readonly 제목: 화면제목;
  readonly 본문: Locator;

  constructor(private readonly page: Page) {
    this.머리 = new 머리글(page);
    this.제목 = new 화면제목(page);
    this.본문 = page.getByRole('main').getByRole('article');
  }

  async 열기(): Promise<void> {
    await this.page.goto(이용약관화면.주소);
    await this.머리.그려질때까지();
  }

  async 현재주소(): Promise<string> {
    return new URL(this.page.url()).pathname;
  }

  async 본문줄들(): Promise<string[]> {
    const 글 = await this.본문.innerText();
    return 글
      .split('\n')
      .map((줄) => 줄.trim())
      .filter((줄) => 줄 !== '');
  }

  async 조제목들(): Promise<string[]> {
    const 줄들 = await this.본문줄들();
    return 줄들.filter((줄) => /^제\d+조 \(.+\)$/.test(줄));
  }

  async 첫조제목(): Promise<string> {
    const 조들 = await this.조제목들();
    return 조들[0] ?? '';
  }

  async 부칙문장(): Promise<string> {
    const 줄들 = await this.본문줄들();
    return 줄들[줄들.length - 1] ?? '';
  }
}
