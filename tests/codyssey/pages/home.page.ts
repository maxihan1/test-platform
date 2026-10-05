import type { Locator, Page } from '@playwright/test';

export class 홈화면 {
  readonly page: Page;
  readonly 첫제목: Locator;
  readonly 교육과정신청버튼: Locator;

  constructor(page: Page) {
    this.page = page;
    this.첫제목 = page.getByRole('heading', {
      name: '학비와 시간 제약 없이 장학금 받으며 배우는 AI전문인재 과정',
      level: 1,
    });
    this.교육과정신청버튼 = page.getByRole('button', { name: '교육과정 신청하기' });
  }

  async 연다(): Promise<void> {
    await this.page.goto('/');
  }

  지역링크(이름: string): Locator {
    return this.page.getByRole('banner').getByRole('link', { name: 이름, exact: true });
  }

  바닥글버튼(이름: string): Locator {
    return this.page.getByRole('contentinfo').getByRole('button', { name: 이름, exact: true });
  }

  전체메뉴링크(이름: string): Locator {
    return this.page.getByRole('link', { name: 이름, exact: true });
  }
}
