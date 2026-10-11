import type { Locator, Page } from '@playwright/test';

export class 상담창 {
  readonly 요소: Locator;
  readonly 상담버튼: Locator;
  readonly 창: Locator;
  readonly 기록: Locator;
  readonly 입력칸: Locator;
  readonly 보내기: Locator;
  readonly 닫기: Locator;

  constructor(page: Page) {
    this.요소 = page.locator('dm-chat');
    this.상담버튼 = page.getByRole('button', { name: '상담하기' });
    this.창 = page.getByRole('region', { name: '상담 창' }).or(page.locator('dm-chat .panel'));
    this.기록 = page.locator('dm-chat').getByRole('log');
    this.입력칸 = page.getByRole('textbox', { name: '상담 메시지' });
    this.보내기 = page.locator('dm-chat').getByRole('button', { name: '보내기' });
    this.닫기 = page.getByRole('button', { name: '상담 창 닫기' });
  }
}
