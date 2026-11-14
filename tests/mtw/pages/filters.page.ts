import type { Locator, Page } from '@playwright/test';

import { 설정틀 } from '../components/settings-shell.component.js';

export class 필터화면 {
  static readonly 주소 = '/filters';

  readonly 틀: 설정틀;
  readonly 제목: Locator;
  readonly 필터추가: Locator;
  readonly 비었음: Locator;
  readonly 새제목칸: Locator;
  readonly 키워드칸: Locator;
  readonly 저장: Locator;
  readonly 칸오류: Locator;

  constructor(private readonly page: Page) {
    this.틀 = new 설정틀(page);
    this.제목 = page.getByRole('main').getByRole('heading', { level: 1 });
    this.필터추가 = page.getByRole('link', { name: '필터 추가' });
    this.비었음 = page.getByText('필터가 없습니다.');
    this.새제목칸 = page.getByRole('textbox', { name: '제목' });
    this.키워드칸 = page.locator('input[name="custom_filter[keywords_attributes][0][keyword]"]');
    this.저장 = page.getByRole('button', { name: /새 필터 저장|변경 사항을 저장/ });
    this.칸오류 = page.locator('.field_with_errors .error, .flash-message.alert');
  }

  async 열기(): Promise<void> {
    await this.page.goto(필터화면.주소);
    await this.제목.waitFor();
  }

  async 새로열기(): Promise<void> {
    await this.page.goto('/filters/new');
    await this.새제목칸.waitFor();
  }

  맥락(이름: string): Locator {
    return this.page.getByRole('checkbox', { name: 이름, exact: true });
  }

  필터줄(제목: string): Locator {
    return this.page.locator('.filters-list__item, .permissions-list__item, .announcements-list__item').filter({ hasText: 제목 });
  }

  async 저장하기(): Promise<void> {
    await this.저장.click();
    await this.page.waitForLoadState('domcontentloaded');
  }
}
