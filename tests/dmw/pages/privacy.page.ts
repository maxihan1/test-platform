import type { Locator, Page } from '@playwright/test';

import { 머리글 } from '../components/header.component.js';
import { 화면제목 } from '../components/page-heading.component.js';

export class 개인정보처리방침화면 {
  static readonly 주소 = '/privacy';

  readonly 머리: 머리글;
  readonly 제목: 화면제목;
  readonly 큰제목: Locator;
  readonly 본문: Locator;

  constructor(private readonly page: Page) {
    this.머리 = new 머리글(page);
    this.제목 = new 화면제목(page);
    this.큰제목 = this.제목.글(/^개인정보처리방침$/);
    this.본문 = page.getByRole('article');
  }

  async 열기(): Promise<void> {
    await this.page.goto(개인정보처리방침화면.주소);
    await this.그려질때까지();
  }

  async 그려질때까지(): Promise<void> {
    await this.본문.waitFor();
    await this.머리.그려질때까지();
  }

  현재경로(): string {
    return new URL(this.page.url()).pathname;
  }

  private async 줄들(): Promise<string[]> {
    const 글 = await this.본문.innerText();
    return 글
      .split('\n')
      .map((줄) => 줄.trim())
      .filter((줄) => 줄 !== '');
  }

  async 조제목들(): Promise<string[]> {
    return (await this.줄들()).filter((줄) => /^제\d+조 \(.+\)$/.test(줄));
  }

  async 첫조제목(): Promise<string> {
    return (await this.조제목들())[0] ?? '';
  }

  async 부칙(): Promise<string> {
    const 줄들 = await this.줄들();
    const 자리 = 줄들.indexOf('부칙');
    return 자리 < 0 ? '' : 줄들.slice(자리 + 1).join('\n');
  }
}
