import type { Locator, Page } from '@playwright/test';

import { 머리글 } from '../components/site-header.component.js';

export class 로그인한홈화면 {
  readonly page: Page;
  readonly 머리글: 머리글;
  readonly 첫단계카드: Locator;
  readonly 공지사항제목: Locator;
  readonly FAQ제목: Locator;
  readonly 공지더보기링크: Locator;
  readonly FAQ더보기링크: Locator;
  readonly 사용자메뉴버튼: Locator;
  readonly 내정보버튼: Locator;
  readonly 로그아웃버튼: Locator;
  readonly 공지목록제목: Locator;
  readonly 공지목록검색어칸: Locator;

  constructor(page: Page) {
    this.page = page;
    this.머리글 = new 머리글(page);
    this.첫단계카드 = page.getByText('Journey Start!');
    this.공지사항제목 = page.getByRole('heading', { name: '공지사항', exact: true });
    this.FAQ제목 = page.getByRole('heading', { name: 'FAQ', exact: true });
    this.공지더보기링크 = page.locator('a[href="/board/noticeGoList"]', { hasText: '더보기' });
    this.FAQ더보기링크 = page.locator('a[href="/board/faqGoList"]', { hasText: '더보기' });
    this.사용자메뉴버튼 = this.머리글.영역.getByRole('button');
    this.내정보버튼 = this.머리글.영역.getByRole('button', { name: '내 정보', exact: true });
    this.로그아웃버튼 = this.머리글.영역.getByRole('button', { name: '로그아웃', exact: true });
    this.공지목록제목 = page.getByRole('heading', { name: '공지사항', level: 1 });
    this.공지목록검색어칸 = page.getByPlaceholder('검색어를 입력하세요.');
  }

  async 연다(): Promise<void> {
    await this.page.goto('/');
  }

  async 사용자메뉴를연다(): Promise<void> {
    await this.사용자메뉴버튼.click();
  }

  async 공지더보기를누른다(): Promise<void> {
    await this.공지더보기링크.click();
  }
}
