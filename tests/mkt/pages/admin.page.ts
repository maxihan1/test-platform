import type { Locator, Page } from '@playwright/test';
import { 머리글 } from '../components/header.component.js';

export class 관리자화면 {
  static readonly 주소 = '/admin';
  readonly 권한없음제목: Locator;
  readonly 권한없음안내: Locator;
  readonly 홈으로링크: Locator;
  readonly 머리글: 머리글;

  constructor(readonly page: Page) {
    const 본문 = page.locator('main');
    this.권한없음제목 = page.getByRole('heading', { name: '권한이 없습니다', level: 1 });
    this.권한없음안내 = 본문.getByText('이 화면을 볼 수 있는 권한이 없습니다.');
    this.홈으로링크 = 본문.getByRole('link', { name: '홈으로' });
    this.머리글 = new 머리글(page);
  }

  async 열기(): Promise<void> {
    await this.page.goto(관리자화면.주소);
    await this.머리글.그려질때까지();
  }

  async 주소로열기(주소: string): Promise<void> {
    await this.page.goto(주소);
    await this.머리글.그려질때까지();
  }
}
