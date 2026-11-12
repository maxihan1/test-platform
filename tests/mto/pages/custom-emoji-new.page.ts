import type { Locator, Page } from '@playwright/test';

import { 알림 } from '../components/flash.component.js';

export class 커스텀에모지추가화면 {
  static readonly 주소 = '/admin/custom_emojis/new';

  readonly 제목: Locator;
  readonly 짧은코드칸: Locator;
  readonly 이미지칸: Locator;
  readonly 업로드: Locator;
  readonly 알림: 알림;
  readonly 오류안내: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '새 커스텀 에모지 추가', level: 1 });
    this.짧은코드칸 = page.getByRole('textbox', { name: '짧은 코드' });
    this.이미지칸 = page.getByLabel('Image', { exact: true });
    this.업로드 = page.getByRole('button', { name: '업로드' });
    this.알림 = new 알림(page);
    this.오류안내 = this.알림.모두.filter({ hasText: /^\s*오류가 발생했습니다/ });
  }

  async 열기(): Promise<void> {
    await this.page.goto(커스텀에모지추가화면.주소);
    await this.제목.waitFor();
  }

  async 올리기(코드: string, 이미지?: { name: string; mimeType: string; buffer: Buffer }): Promise<void> {
    await this.열기();
    await this.짧은코드칸.fill(코드);
    if (이미지 !== undefined) await this.이미지칸.setInputFiles(이미지);
    await this.업로드.click();
  }
}
