import type { Locator, Page } from '@playwright/test';

import { 머리글 } from '../components/header.component.js';

export class 회원가입화면 {
  readonly 제목: Locator;
  readonly 머리글: 머리글;
  readonly 이용약관보기버튼: Locator;
  readonly 입력칸들: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '회원가입', level: 1 });
    this.머리글 = new 머리글(page);
    this.이용약관보기버튼 = page.locator('[data-term=terms]');
    this.입력칸들 = page.getByRole('main').locator('input:not([type=hidden]), select, textarea');
  }

  async 열기(): Promise<void> {
    await this.page.goto('/signup');
    await this.제목.waitFor();
    await this.이용약관보기버튼.waitFor();
    await this.머리글.로고.waitFor();
  }

  async 이름표없는칸들(): Promise<string[]> {
    return this.입력칸들.evaluateAll((칸들) =>
      칸들
        .filter((칸) => (칸 as HTMLInputElement).labels === null || (칸 as HTMLInputElement).labels?.length === 0)
        .map((칸) => `${칸.tagName.toLowerCase()}:${칸.getAttribute('type') ?? ''}:${칸.getAttribute('data-k') ?? ''}`),
    );
  }

  async 세로위치(): Promise<number> {
    return this.page.evaluate(() => Math.round(window.scrollY));
  }

  async 초점이이용약관보기에있나(): Promise<boolean> {
    return this.이용약관보기버튼.evaluate((el) => el === document.activeElement);
  }
}
