import type { Locator, Page } from '@playwright/test';

export class 네이티브모집안내화면 {
  readonly 제목: Locator;
  readonly 공고문바로보기버튼: Locator;
  readonly 공고문다운로드버튼: Locator;
  readonly FAQ버튼: Locator;
  readonly 신청절차구역제목: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: 'AI 네이티브', level: 1, exact: true });
    this.공고문바로보기버튼 = page.getByRole('button', { name: '공고문 바로보기', exact: true });
    this.공고문다운로드버튼 = page.getByRole('button', { name: '공고문 다운로드', exact: true });
    this.FAQ버튼 = page.getByRole('button', { name: 'FAQ', exact: true });
    this.신청절차구역제목 = page.getByRole('heading', { name: '신청절차', level: 3, exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto('/guide/aiNative');
  }

  async FAQ누르기(): Promise<void> {
    await this.FAQ버튼.click();
  }
}
