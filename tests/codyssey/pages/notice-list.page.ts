import type { Locator, Page } from '@playwright/test';
import { 게시판검색 } from '../components/board-search.component.js';

export class 공지목록화면 {
  readonly page: Page;
  readonly 제목: Locator;
  readonly 검색: 게시판검색;
  readonly 공지들: Locator;
  readonly 공지제목들: Locator;
  readonly 결과없음문구: Locator;

  constructor(page: Page) {
    this.page = page;
    const 본문 = page.getByRole('main');
    this.제목 = 본문.getByRole('heading', { name: '공지사항', level: 1 });
    this.검색 = new 게시판검색(page);
    this.공지제목들 = 본문.getByRole('heading', { level: 3 });
    this.공지들 = 본문.getByRole('listitem').filter({ has: page.getByRole('heading', { level: 3 }) });
    this.결과없음문구 = 본문.getByText('검색결과가 없습니다.');
  }

  async 연다(): Promise<void> {
    await this.page.goto('/board/noticeGoList');
  }

  async 첫글제목을누른다(): Promise<void> {
    await this.공지제목들.first().click();
  }
}
