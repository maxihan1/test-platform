import type { FrameLocator, Locator, Page } from '@playwright/test';

export class 교육콘텐츠체험화면 {
  readonly page: Page;
  readonly 체험앱: FrameLocator;
  readonly 제목: Locator;
  readonly 체험시작버튼: Locator;
  readonly 단계표시: Locator;
  readonly 학습시작버튼: Locator;

  constructor(page: Page) {
    this.page = page;
    this.체험앱 = page.getByTitle('교육 콘텐츠 체험').contentFrame();
    this.제목 = this.체험앱.getByRole('heading', { name: /학습 플랫폼을\s*미리 체험해보세요/, level: 2 });
    this.체험시작버튼 = this.체험앱.getByRole('button', { name: '체험 시작하기' });
    this.단계표시 = this.체험앱.getByText('STEP 1 / 6', { exact: true });
    this.학습시작버튼 = this.체험앱.getByRole('button', { name: '학습 START' });
  }

  async 연다(): Promise<void> {
    await this.page.goto('/apply/educationContentDemo');
  }

  async 체험시작을누른다(): Promise<void> {
    await this.체험시작버튼.click();
  }
}
