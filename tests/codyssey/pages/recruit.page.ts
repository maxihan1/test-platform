import type { Locator, Page } from '@playwright/test';

export class 올인원모집안내화면 {
  readonly 제목: Locator;
  readonly 성장구역제목: Locator;
  readonly 지원혜택구역제목: Locator;
  readonly 유의사항구역제목: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: 'AI 올인원', level: 1, exact: true });
    this.성장구역제목 = page.getByRole('heading', { name: '코디세이 AI 올인원 과정을 통한 성장', level: 3, exact: true });
    this.지원혜택구역제목 = page.getByRole('heading', { name: '지원 혜택', level: 3, exact: true });
    this.유의사항구역제목 = page.getByRole('heading', { name: '지원 시 유의사항', level: 3, exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto('/guide/recruitmentNotice');
  }
}
