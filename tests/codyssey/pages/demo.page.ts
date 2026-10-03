import type { FrameLocator, Locator, Page } from '@playwright/test';

export class 교육콘텐츠체험화면 {
  readonly 체험틀: Locator;
  readonly 닫기버튼: Locator;
  readonly 틀안: FrameLocator;
  readonly 체험시작버튼: Locator;
  readonly 첫단계표시: Locator;

  constructor(private readonly page: Page) {
    this.체험틀 = page.getByTitle('교육 콘텐츠 체험');
    this.닫기버튼 = page.getByRole('button', { name: '닫기' });
    this.틀안 = page.frameLocator('iframe[title="교육 콘텐츠 체험"]');
    this.체험시작버튼 = this.틀안.getByRole('button', { name: '체험 시작하기 →' });
    this.첫단계표시 = this.틀안.getByText('STEP 1 / 6');
  }

  async 열기(): Promise<void> {
    await this.page.goto('/apply/educationContentDemo');
  }
}
