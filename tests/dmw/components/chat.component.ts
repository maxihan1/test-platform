import type { Locator, Page } from '@playwright/test';

export class 상담창 {
  readonly 요소: Locator;
  readonly 상담버튼: Locator;
  readonly 창: Locator;
  readonly 닫기: Locator;
  readonly 입력: Locator;
  readonly 보내기: Locator;
  readonly 대화: Locator;

  constructor(page: Page) {
    this.요소 = page.locator('dm-chat');
    this.상담버튼 = page.getByRole('button', { name: '상담하기', exact: true });
    this.창 = page.getByRole('region', { name: '상담 창' });
    this.닫기 = this.창.getByRole('button', { name: '상담 창 닫기', exact: true });
    this.입력 = this.창.getByRole('textbox', { name: '상담 메시지' });
    this.보내기 = this.창.getByRole('button', { name: '보내기', exact: true });
    this.대화 = this.창.getByRole('log');
  }

  답변(문구: string): Locator {
    return this.대화.locator('.bot').filter({ hasText: 문구 });
  }
}
