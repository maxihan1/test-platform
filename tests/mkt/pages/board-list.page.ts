import type { Locator, Page } from '@playwright/test';

export class 게시판목록 {
  constructor(private readonly page: Page) {}

  get 분류탭묶음(): Locator {
    return this.page.getByRole('tablist', { name: '분류' });
  }

  분류탭(이름: string): Locator {
    return this.분류탭묶음.getByRole('tab', { name: 이름, exact: true });
  }

  get 검색조건(): Locator {
    return this.page.getByRole('combobox', { name: '검색 조건' });
  }

  get 검색어(): Locator {
    return this.page.getByRole('searchbox', { name: '검색어' });
  }

  get 검색버튼(): Locator {
    return this.page.getByRole('search').getByRole('button', { name: '검색', exact: true });
  }

  get 정렬(): Locator {
    return this.page.getByRole('combobox', { name: '정렬' });
  }

  get 표(): Locator {
    return this.page.locator('table.list');
  }

  get 글쓰기(): Locator {
    return this.page.getByRole('link', { name: '글쓰기' });
  }

  get 머리칸(): Locator {
    return this.표.getByRole('columnheader');
  }

  get 공지줄(): Locator {
    return this.표.locator('tr.notice');
  }

  get 일반줄(): Locator {
    return this.표.locator('tbody tr:not(.notice)');
  }

  get 모든줄(): Locator {
    return this.표.locator('tbody tr');
  }

  get 공지표시(): Locator {
    return this.공지줄.locator('.notice-mark');
  }

  get 댓글수들(): Locator {
    return this.표.locator('.cmt-count');
  }

  get 제목링크들(): Locator {
    return this.표.locator('td.title a');
  }

  get 일반제목들(): Locator {
    return this.일반줄.locator('td.title a');
  }

  get 분류칸들(): Locator {
    return this.일반줄.locator('td:nth-child(2)');
  }

  get 작성자칸들(): Locator {
    return this.일반줄.locator('td:nth-child(4)');
  }

  get 작성일칸들(): Locator {
    return this.일반줄.locator('td:nth-child(5)');
  }

  get 조회수칸들(): Locator {
    return this.일반줄.locator('td:nth-child(6)');
  }

  get 좋아요칸들(): Locator {
    return this.일반줄.locator('td:nth-child(7)');
  }

  get 정렬항목(): Locator {
    return this.정렬.getByRole('option');
  }

  get 페이지묶음(): Locator {
    return this.page.getByRole('navigation', { name: '페이지' });
  }

  get 이전(): Locator {
    return this.페이지묶음.getByRole('button', { name: '이전', exact: true });
  }

  get 다음(): Locator {
    return this.페이지묶음.getByRole('button', { name: '다음', exact: true });
  }

  get 쪽번호들(): Locator {
    return this.페이지묶음.getByRole('button', { name: /^\d+$/ });
  }

  쪽번호(번호: number): Locator {
    return this.페이지묶음.getByRole('button', { name: String(번호), exact: true });
  }

  get 빈안내(): Locator {
    return this.page.getByText('검색 결과가 없습니다');
  }

  글링크(제목: string): Locator {
    return this.표.getByRole('link', { name: 제목, exact: true });
  }

  get 분류탭들(): Locator {
    return this.분류탭묶음.getByRole('tab');
  }

  get 정렬선택(): Locator {
    return this.정렬.locator('option:checked');
  }

  get 첫줄공지표시(): Locator {
    return this.모든줄.first().locator('.notice-mark');
  }

  get 현재쪽(): Locator {
    return this.페이지묶음.locator('[aria-current="page"]');
  }

  get 마지막쪽번호(): Locator {
    return this.쪽번호들.last();
  }

  줄(제목: string): Locator {
    return this.표.getByRole('row').filter({ has: this.page.getByRole('link', { name: 제목, exact: true }) });
  }

  댓글수(제목: string): Locator {
    return this.줄(제목).locator('.cmt-count');
  }

  async 첫일반글제목(): Promise<string> {
    return this.일반줄.first().locator('td.title a').innerText();
  }

  async 첫일반글이바뀔때까지(이전제목: string): Promise<void> {
    await this.일반줄.first().filter({ hasNotText: 이전제목 }).waitFor();
  }

  get 불러오는중(): Locator {
    return this.page.locator('#board[aria-busy="true"]');
  }

  async 불러오기끝(): Promise<void> {
    await this.불러오는중.waitFor({ state: 'hidden' });
    await this.제목링크들.first().waitFor();
  }

  async 줄이뜰때까지(): Promise<void> {
    await this.제목링크들.first().waitFor();
  }

  async 열기(쿼리 = ''): Promise<void> {
    await this.page.goto(`/board${쿼리}`);
    await this.분류탭('전체').waitFor();
  }

  async 검색한다(글자: string): Promise<void> {
    await this.검색어.fill(글자);
    await this.검색버튼.click();
  }
}
