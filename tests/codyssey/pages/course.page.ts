import type { Locator, Page } from '@playwright/test';

import { 제목 } from '../components/title.component.js';

export class 교육과정화면 {
  private readonly 제목부: 제목;

  constructor(private readonly page: Page) {
    this.제목부 = new 제목(page);
  }

  async 연다(): Promise<void> {
    await this.page.goto('/apply/course');
  }

  get 제목(): Locator {
    return this.제목부.대제목('교육과정');
  }

  머리글(이름: string): Locator {
    return this.제목부.중제목(이름).or(this.제목부.소제목(이름));
  }

  get 마지막머리글(): Locator {
    return this.머리글('AI 네이티브 과정 (최대 5개월)');
  }

  async 보이는머리글(이름들: string[]): Promise<string[]> {
    const 보임: string[] = [];
    for (const 이름 of 이름들) {
      if (await this.머리글(이름).isVisible()) 보임.push(이름);
    }
    return 보임;
  }

  get 자세히보기버튼들(): Locator {
    return this.page.getByRole('button', { name: '자세히 보기', exact: true });
  }

  get 올인원자세히보기버튼(): Locator {
    return this.page
      .locator('.course-card')
      .filter({ has: this.page.getByRole('heading', { name: 'AI 올인원 과정' }) })
      .getByRole('button', { name: '자세히 보기', exact: true });
  }

  async 자세히보기를누른다(): Promise<void> {
    await this.올인원자세히보기버튼.click();
  }
}
