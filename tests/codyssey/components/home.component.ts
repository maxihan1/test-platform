import type { Locator, Page } from '@playwright/test';

export class 홈부품 {
  readonly 여정시작: Locator;
  readonly 공지사항제목: Locator;
  readonly FAQ제목: Locator;

  constructor(private readonly page: Page) {
    this.여정시작 = page.getByText('Journey Start!');
    this.공지사항제목 = page.getByRole('heading', { name: '공지사항', level: 3 });
    this.FAQ제목 = page.getByRole('heading', { name: 'FAQ', level: 2 });
  }

  타일(이름: string): Locator {
    return this.page.locator('.hex-obj').filter({ hasText: 이름 });
  }

  타일버튼(이름: string): Locator {
    return this.타일(이름).getByRole('button');
  }
}
