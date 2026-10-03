import type { Locator, Page } from '@playwright/test';

export class 지원혜택화면 {
  readonly 제목: Locator;
  readonly 소제목: Locator;
  readonly 혜택카드: Locator;
  readonly 이전영상버튼: Locator;
  readonly 다음영상버튼: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '지원혜택', level: 1 });
    this.소제목 = page.getByRole('heading', { name: '누구에게나 열려 있는 기회', level: 2 });
    this.혜택카드 = page.getByRole('listitem').filter({ has: page.getByRole('img') });
    this.이전영상버튼 = page.getByRole('button', { name: '이전 영상' });
    this.다음영상버튼 = page.getByRole('button', { name: '다음 영상' });
  }

  async 열기(): Promise<void> {
    await this.page.goto('/apply/benefits');
  }
}
