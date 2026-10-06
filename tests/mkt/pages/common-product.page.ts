import type { Locator, Page } from '@playwright/test';

import { 머리글 } from '../components/header.component.js';

export class 상품상세화면 {
  readonly 제목: Locator;
  readonly 머리글: 머리글;
  readonly 리뷰탭: Locator;
  readonly 실패문구: Locator;
  readonly 다시시도버튼: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { level: 1 });
    this.머리글 = new 머리글(page);
    this.리뷰탭 = page.getByRole('tab', { name: /^리뷰/ });
    this.실패문구 = page.getByText('리뷰를 불러오지 못했습니다', { exact: true });
    this.다시시도버튼 = page.getByRole('button', { name: '다시 시도', exact: true });
  }

  async 열기(상품번호: number): Promise<void> {
    await this.page.goto(`/shop/${상품번호}`);
    await this.제목.waitFor();
    await this.머리글.로고.waitFor();
    await this.리뷰탭.waitFor();
  }
}
