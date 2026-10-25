import type { Locator, Page } from '@playwright/test';

export class 모달 {
  readonly 창: Locator;
  readonly 제목: Locator;
  readonly 본문: Locator;
  readonly 닫기X: Locator;
  readonly 뒤판: Locator;

  constructor(page: Page, 제목?: string | RegExp) {
    this.창 = 제목 === undefined ? page.getByRole('dialog') : page.getByRole('dialog', { name: 제목 });
    this.제목 = this.창.getByRole('heading');
    this.본문 = this.창.locator('.modal-body');
    this.닫기X = this.창.locator('.modal-x');
    this.뒤판 = page.locator('.modal-backdrop').filter({ has: this.창 });
  }

  버튼(이름: string): Locator {
    return this.창.locator('.modal-foot').getByRole('button', { name: 이름, exact: true });
  }

  async 뜰때까지(): Promise<void> {
    await this.창.waitFor();
  }

  async 사라질때까지(): Promise<void> {
    await this.창.waitFor({ state: 'detached' });
  }

  async 바깥누르기(): Promise<void> {
    const 상자 = await this.창.boundingBox();
    if (상자 === null) throw new Error('모달이 화면에 없어 바깥을 누를 수 없다');
    await this.뒤판.click({ position: { x: 5, y: 5 } });
  }
}
