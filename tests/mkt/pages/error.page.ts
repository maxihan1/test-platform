import type { Locator, Page } from '@playwright/test';
import { 머리글 } from '../components/header.component.js';

export class 없는주소화면 {
  static readonly 주소 = '/no-such-page';
  readonly 제목: Locator;
  readonly 안내문: Locator;
  readonly 홈으로버튼: Locator;
  readonly 머리글: 머리글;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '페이지를 찾을 수 없습니다', level: 1 });
    this.안내문 = page.getByText('주소가 바뀌었거나 삭제된 페이지입니다.');
    this.홈으로버튼 = page.locator('main').getByRole('link', { name: '홈으로' });
    this.머리글 = new 머리글(page);
  }

  async 열기(): Promise<void> {
    await this.page.goto(없는주소화면.주소);
    await this.제목.waitFor();
    await this.머리글.그려질때까지();
  }
}
