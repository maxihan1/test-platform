import type { Locator, Page } from '@playwright/test';

import { 제목 } from '../components/title.component.js';

export class 올인원모집안내화면 {
  private readonly 제목부: 제목;

  constructor(private readonly page: Page) {
    this.제목부 = new 제목(page);
  }

  async 연다(): Promise<void> {
    await this.page.goto('/guide/recruitmentNotice');
  }

  get 제목(): Locator {
    return this.제목부.대제목('AI 올인원');
  }

  get 과정머리글(): Locator {
    return this.page.getByRole('heading', { level: 2, name: '코디세이 AI 올인원 과정' });
  }

  머리글(이름: string): Locator {
    return this.제목부.중제목(이름).or(this.제목부.소제목(이름));
  }

  get 마지막머리글(): Locator {
    return this.머리글('지원 시 유의사항');
  }

  async 보이는머리글(이름들: string[]): Promise<string[]> {
    const 보임: string[] = [];
    for (const 이름 of 이름들) {
      if (await this.머리글(이름).isVisible()) 보임.push(이름);
    }
    return 보임;
  }
}
