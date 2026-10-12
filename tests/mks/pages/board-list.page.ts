import type { Locator, Page } from '@playwright/test';

export interface 목록행 {
  번호: string;
  분류: string;
  제목: string;
  작성자: string;
  작성일: string;
  조회수: number;
  좋아요: number;
}

function 행으로(줄: string): 목록행 {
  const 칸 = 줄.split('\t');
  return {
    번호: 칸[0] ?? '',
    분류: 칸[1] ?? '',
    제목: (칸[2] ?? '').replace(/\[\d+\]$/, ''),
    작성자: 칸[3] ?? '',
    작성일: 칸[4] ?? '',
    조회수: Number(칸[5] ?? ''),
    좋아요: Number(칸[6] ?? ''),
  };
}

export class 게시판목록화면 {
  static readonly 주소 = '/board';

  readonly 제목: Locator;
  readonly 분류탭들: Locator;
  readonly 검색폼: Locator;
  readonly 검색조건: Locator;
  readonly 검색어: Locator;
  readonly 검색: Locator;
  readonly 정렬: Locator;
  readonly 표: Locator;
  readonly 글이든행: Locator;
  readonly 공지표시: Locator;
  readonly 공지행: Locator;
  readonly 일반행: Locator;
  readonly 결과없음: Locator;
  readonly 페이저: Locator;
  readonly 이전: Locator;
  readonly 이전켜짐: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { name: '커뮤니티', level: 1 });
    this.분류탭들 = page.getByRole('tablist', { name: '분류' });
    this.검색폼 = page.getByRole('search');
    this.검색조건 = this.검색폼.getByLabel('검색 조건');
    this.검색어 = this.검색폼.getByRole('searchbox', { name: '검색어' });
    this.검색 = this.검색폼.getByRole('button', { name: '검색', exact: true });
    this.정렬 = page.getByLabel('정렬', { exact: true });
    this.표 = page.getByRole('table');
    this.글이든행 = this.표.getByRole('row').filter({ has: page.getByRole('link') });
    this.공지표시 = page.getByText('공지', { exact: true });
    this.공지행 = this.글이든행.filter({ has: this.공지표시 });
    this.일반행 = this.글이든행.filter({ hasNot: this.공지표시 });
    this.결과없음 = page.getByText('검색 결과가 없습니다', { exact: true });
    this.페이저 = page.getByRole('navigation', { name: '페이지' });
    this.이전 = this.페이저.getByRole('button', { name: '이전', exact: true });
    this.이전켜짐 = this.페이저.getByRole('button', { name: '이전', exact: true, disabled: false });
  }

  async 열기(): Promise<void> {
    await this.page.goto(게시판목록화면.주소);
  }

  async 그려질때까지(): Promise<void> {
    await this.일반행.first().or(this.결과없음).first().waitFor();
    await this.두프레임기다리기();
  }

  분류탭(이름: string): Locator {
    return this.분류탭들.getByRole('tab', { name: 이름, exact: true });
  }

  번호버튼(번호: number): Locator {
    return this.페이저.getByRole('button', { name: String(번호), exact: true });
  }

  private async 두프레임기다리기(): Promise<void> {
    await this.page.evaluate(() => new Promise<void>((끝) => requestAnimationFrame(() => requestAnimationFrame(() => 끝()))));
  }

  private 글목록응답(조건: { sort?: string; page?: string; category?: string; q?: string }): Promise<unknown> {
    return this.page.waitForResponse((응답) => {
      const 주소 = new URL(응답.url());
      if (주소.pathname !== '/api/posts' || 응답.request().method() !== 'GET') return false;
      return Object.entries(조건).every(([키, 값]) => 주소.searchParams.get(키) === 값);
    });
  }

  async 쪽누르기(번호: number): Promise<void> {
    const 응답 = this.글목록응답({ page: String(번호) });
    await this.번호버튼(번호).click();
    await 응답;
    await this.두프레임기다리기();
  }

  async 분류탭누르기(이름: string): Promise<void> {
    const 응답 = this.글목록응답({ category: 이름 });
    await this.분류탭(이름).click();
    await 응답;
    await this.두프레임기다리기();
  }

  async 정렬고르기(이름: '최신순' | '조회순' | '좋아요순'): Promise<void> {
    const 값 = { 최신순: 'latest', 조회순: 'views', 좋아요순: 'likes' }[이름];
    const 응답 = this.글목록응답({ sort: 값 });
    await this.정렬.selectOption({ label: 이름 });
    await 응답;
    await this.두프레임기다리기();
  }

  async 검색하기(조건: '제목' | '내용' | '작성자', 글: string): Promise<void> {
    const 응답 = this.글목록응답({ q: 글 });
    await this.검색조건.selectOption({ label: 조건 });
    await this.검색어.fill(글);
    await this.검색.click();
    await 응답;
    await this.두프레임기다리기();
  }

  async 일반행들(): Promise<목록행[]> {
    return (await this.일반행.allInnerTexts()).map(행으로);
  }

  async 맨위공지수(): Promise<number> {
    const 번호칸들 = (await this.글이든행.allInnerTexts()).map((줄) => 줄.split('\t')[0] ?? '');
    const 처음일반 = 번호칸들.findIndex((번호) => 번호 !== '공지');
    return 처음일반 === -1 ? 번호칸들.length : 처음일반;
  }
}
