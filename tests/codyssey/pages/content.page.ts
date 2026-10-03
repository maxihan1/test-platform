import type { Locator, Page } from '@playwright/test';

export class 교육콘텐츠화면 {
  readonly 제목: Locator;
  readonly 소개영상플레이어: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '교육 콘텐츠 알아보기', level: 1 });
    this.소개영상플레이어 = page.getByLabel('AI·SW 응용 학습 소개 영상 플레이어');
  }

  구역제목(이름: string): Locator {
    return this.page.getByRole('heading', { name: 이름, level: 3, exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto('/apply/educationContent');
  }
}
