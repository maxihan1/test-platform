import type { Locator, Page } from '@playwright/test';

export class 상담창 {
  readonly 위젯: Locator;
  readonly 상담버튼: Locator;
  readonly 창: Locator;
  readonly 대화: Locator;
  readonly 입력칸: Locator;
  readonly 보내기: Locator;
  readonly 닫기: Locator;

  constructor(readonly page: Page) {
    this.위젯 = page.locator('dm-chat');
    this.상담버튼 = this.위젯.getByRole('button', { name: '상담하기' });
    this.창 = this.위젯.getByRole('region', { name: '상담 창' });
    this.대화 = this.창.getByRole('log');
    this.입력칸 = this.창.getByLabel('상담 메시지');
    this.보내기 = this.창.getByRole('button', { name: '보내기' });
    this.닫기 = this.창.getByRole('button', { name: '상담 창 닫기' });
  }
}
