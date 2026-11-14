import type { Locator, Page } from '@playwright/test';

import { 설정틀 } from '../components/settings-shell.component.js';

export class 공개프로필설정화면 {
  static readonly 주소 = '/settings/profile';

  readonly 틀: 설정틀;
  readonly 제목: Locator;
  readonly 배너제목: Locator;
  readonly 이동: Locator;
  readonly 편집칸: Locator;

  constructor(private readonly page: Page) {
    this.틀 = new 설정틀(page);
    this.제목 = page.getByRole('main').getByRole('heading', { name: '공개 프로필', level: 1 });
    this.배너제목 = page.getByText('새로운 프로필 편집 경험이 기다립니다');
    this.이동 = page.getByRole('main').getByRole('link', { name: '이동' });
    this.편집칸 = page.getByRole('main').locator('input:not([type="hidden"]), textarea, select');
  }

  async 열기(): Promise<void> {
    await this.page.goto(공개프로필설정화면.주소);
    await this.제목.waitFor();
  }
}
