import type { Locator, Page } from '@playwright/test';

export class 뮤트창 {
  static readonly 주소 = '/@{아이디}';

  readonly 창: Locator;
  readonly 제목: Locator;
  readonly 옵션보기: Locator;
  readonly 취소: Locator;
  readonly 기간없음: Locator;
  readonly 알림숨기기: Locator;

  constructor(page: Page) {
    this.창 = page.getByRole('dialog');
    this.제목 = this.창.getByRole('heading', { level: 1 });
    this.옵션보기 = this.창.getByRole('button', { name: '옵션 보기' });
    this.취소 = this.창.getByRole('button', { name: '취소' });
    this.기간없음 = this.창.getByLabel('내가 뮤트를 해제하기 전까지');
    this.알림숨기기 = this.창.getByLabel('알림에서 숨기기');
  }

  async 뜰때까지(): Promise<void> {
    await this.제목.waitFor();
  }

  async 옵션열기(): Promise<void> {
    if (await this.옵션보기.isVisible()) await this.옵션보기.click();
    await this.기간없음.waitFor({ state: 'attached' });
  }

  async 닫기(): Promise<void> {
    await this.취소.click();
    await this.창.first().waitFor({ state: 'detached' });
  }
}
