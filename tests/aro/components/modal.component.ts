import type { Locator, Page } from '@playwright/test';

export class 창 {
  readonly 상자: Locator;
  readonly 제목: Locator;
  readonly 본문: Locator;
  readonly 엑스: Locator;
  readonly 바깥: Locator;

  constructor(private readonly page: Page) {
    this.상자 = page.locator('.modal-backdrop.open').getByRole('dialog');
    this.제목 = this.상자.getByRole('heading', { level: 2 });
    this.본문 = this.상자.locator('.modal-body');
    this.엑스 = this.상자.locator('.modal-x');
    this.바깥 = page.locator('.modal-backdrop.open');
  }

  버튼(이름: string): Locator {
    return this.상자.locator('.modal-foot').getByRole('button', { name: 이름, exact: true });
  }

  칸(라벨: string | RegExp): Locator {
    return this.상자.getByLabel(라벨);
  }

  async 열릴때까지(기다림 = 10_000): Promise<boolean> {
    return this.상자.waitFor({ timeout: 기다림 }).then(() => true, () => false);
  }

  async 닫힐때까지(기다림 = 10_000): Promise<boolean> {
    return this.상자.waitFor({ state: 'hidden', timeout: 기다림 }).then(() => true, () => false);
  }

  async 누르기(이름: string): Promise<void> {
    await this.버튼(이름).click();
  }

  async 엑스누르기(): Promise<void> {
    await this.엑스.click();
  }

  async 바깥누르기(): Promise<void> {
    await this.바깥.click({ position: { x: 5, y: 5 } });
  }

  async Esc치기(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }
}
