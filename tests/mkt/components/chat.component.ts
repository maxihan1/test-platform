import type { Locator, Page } from '@playwright/test';

export class 상담창 {
  readonly 요소: Locator;
  readonly 상담버튼: Locator;
  readonly 창: Locator;
  readonly 닫기: Locator;
  readonly 기록: Locator;
  readonly 입력칸: Locator;
  readonly 보내기: Locator;

  constructor(readonly page: Page) {
    this.요소 = page.locator('dm-chat');
    this.상담버튼 = this.요소.getByRole('button', { name: '상담하기' });
    this.창 = this.요소.getByRole('region', { name: '상담 창' });
    this.닫기 = this.요소.getByRole('button', { name: '상담 창 닫기' });
    this.기록 = this.요소.getByRole('log');
    this.입력칸 = this.요소.getByRole('textbox');
    this.보내기 = this.요소.getByRole('button', { name: '보내기' });
  }

  async 열기(): Promise<void> {
    await this.상담버튼.click();
    await this.창.waitFor();
  }

  async 보내기누르기(글: string): Promise<void> {
    await this.입력칸.fill(글);
    await this.보내기.click();
  }
}
