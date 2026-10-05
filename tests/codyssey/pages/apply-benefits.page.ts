import type { Locator, Page } from '@playwright/test';

export class 지원혜택화면 {
  readonly page: Page;
  readonly 제목: Locator;
  readonly 이전영상버튼: Locator;
  readonly 다음영상버튼: Locator;
  readonly 보이는영상: Locator;

  constructor(page: Page) {
    this.page = page;
    this.제목 = page.getByRole('main').getByRole('heading', { name: '지원혜택', level: 1, exact: true });
    this.이전영상버튼 = page.getByRole('button', { name: '이전 영상', exact: true });
    this.다음영상버튼 = page.getByRole('button', { name: '다음 영상', exact: true });
    this.보이는영상 = page.locator('.swiper-slide-active iframe');
  }

  이전과다른영상(이전제목: string): Locator {
    return this.page.locator(`.swiper-slide-active iframe:not([title="${이전제목}"])`);
  }

  async 연다(): Promise<void> {
    await this.page.goto('/apply/benefits');
  }

  async 다음영상을누른다(): Promise<void> {
    await this.다음영상버튼.click();
  }
}
