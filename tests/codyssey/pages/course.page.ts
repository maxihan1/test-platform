import type { Locator, Page } from '@playwright/test';

export class 교육과정화면 {
  readonly 제목: Locator;
  readonly 자세히보기버튼: Locator;
  readonly 첫째자세히보기: Locator;
  readonly 둘째자세히보기: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '교육과정', level: 1 });
    this.자세히보기버튼 = page.getByRole('button', { name: '자세히 보기', exact: true });
    this.첫째자세히보기 = this.자세히보기버튼.first();
    this.둘째자세히보기 = this.자세히보기버튼.nth(1);
  }

  구역제목(이름: string): Locator {
    return this.page.getByRole('heading', { name: 이름, exact: true });
  }

  카드제목(이름: string): Locator {
    return this.page.getByRole('heading', { name: 이름 });
  }

  과정창제목(창: Page, 이름: string): Locator {
    return 창.getByRole('heading', { name: 이름, level: 2, exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto('/apply/course');
  }
}
