import type { Locator, Page } from '@playwright/test';

export class 지도화면 {
  static readonly 주소 = '/embed/map';

  readonly 지도: Locator;
  readonly 확대: Locator;
  readonly 축소: Locator;
  readonly 배율: Locator;

  constructor(readonly page: Page) {
    this.지도 = page.getByRole('img', { name: '데모마켓 위치 지도' });
    this.확대 = page.getByRole('button', { name: '확대', exact: true });
    this.축소 = page.getByRole('button', { name: '축소', exact: true });
    this.배율 = page.getByRole('status');
  }

  async 열기(): Promise<void> {
    await this.page.goto(지도화면.주소);
  }

  async 확대누르기(횟수: number): Promise<void> {
    for (let 번 = 0; 번 < 횟수; 번 += 1) await this.확대.click();
  }

  async 축소누르기(횟수: number): Promise<void> {
    for (let 번 = 0; 번 < 횟수; 번 += 1) await this.축소.click();
  }
}
