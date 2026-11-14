import type { Locator, Page } from '@playwright/test';

import { 펼침메뉴 } from '../components/dropdown.component.js';

export class 컬렉션상세화면 {
  static readonly 주소 = '/collections/{번호}';

  readonly 펼침: 펼침메뉴;
  readonly 제목: Locator;
  readonly 자세히: Locator;

  constructor(private readonly page: Page) {
    this.펼침 = new 펼침메뉴(page);
    this.제목 = page.getByRole('main').getByRole('heading', { level: 1 });
    this.자세히 = page.getByRole('main').getByRole('region').getByRole('button', { name: '자세히' });
  }

  async 열기(번호: string): Promise<void> {
    await this.page.goto(`/collections/${번호}`);
    await this.그려질때까지();
  }

  async 그려질때까지(): Promise<void> {
    await this.자세히.waitFor();
  }

  async 메뉴열기(): Promise<void> {
    await this.자세히.click();
    await this.펼침.열릴때까지();
  }

  계정차단(): Locator {
    return this.page.getByRole('button', { name: /계정 차단/ });
  }
}
