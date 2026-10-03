import type { Locator, Page } from '@playwright/test';

import { 제목 } from '../components/title.component.js';

export class 연간교육일정화면 {
  private readonly 제목부: 제목;

  constructor(private readonly page: Page) {
    this.제목부 = new 제목(page);
  }

  async 연다(): Promise<void> {
    await this.page.goto('/apply/schedule');
  }

  get 제목(): Locator {
    return this.제목부.대제목('연간 교육일정');
  }

  get 일정표(): Locator {
    return this.page.getByRole('table', { name: '연간 교육일정' });
  }

  구분(이름: string): Locator {
    return this.page.getByText(이름, { exact: true }).and(this.page.locator('span'));
  }

  async 보이는구분(이름들: string[]): Promise<string[]> {
    const 보임: string[] = [];
    for (const 이름 of 이름들) {
      if (await this.구분(이름).isVisible()) 보임.push(이름);
    }
    return 보임;
  }
}
