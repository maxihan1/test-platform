import type { Locator, Page } from '@playwright/test';

export class 머리글부품 {
  readonly 머리글: Locator;
  readonly 사용자메뉴버튼: Locator;
  readonly 전체메뉴버튼: Locator;
  readonly 내정보버튼: Locator;
  readonly 로그아웃버튼: Locator;

  constructor(page: Page) {
    this.머리글 = page.getByRole('banner');
    this.사용자메뉴버튼 = this.머리글.locator('button.btn-user-setting');
    this.전체메뉴버튼 = page.getByRole('button', { name: '전체메뉴' });
    this.내정보버튼 = this.머리글.locator('.user-setting-dropdown').getByRole('button', { name: '내 정보' });
    this.로그아웃버튼 = this.머리글.locator('.user-setting-dropdown').getByRole('button', { name: '로그아웃' });
  }

  메뉴(이름: string): Locator {
    return this.머리글.getByRole('link', { name: 이름, exact: true });
  }

  async 메뉴에_올리기(이름: string): Promise<void> {
    await this.메뉴(이름).hover();
  }
}
