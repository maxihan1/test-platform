import type { Locator, Page } from '@playwright/test';

import { 머리글 } from '../components/header.component.js';

export class 없는주소화면 {
  readonly 제목: Locator;
  readonly 머리글: 머리글;
  readonly 안내문장: Locator;
  readonly 홈으로: Locator;
  readonly 첫제목: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '페이지를 찾을 수 없습니다', level: 1 });
    this.머리글 = new 머리글(page);
    this.안내문장 = page.getByText('주소가 바뀌었거나 삭제된 페이지입니다.', { exact: true });
    this.홈으로 = page.getByRole('link', { name: '홈으로', exact: true });
    this.첫제목 = page.getByRole('heading', { level: 1 });
  }

  async 열기(주소 = '/no-such-page'): Promise<void> {
    await this.page.goto(주소);
    await this.제목.waitFor();
    await this.머리글.로고.waitFor();
  }

  async 주소열기(주소: string): Promise<void> {
    await this.page.goto(주소);
    await this.첫제목.first().waitFor();
    await this.머리글.로고.waitFor();
  }
}
