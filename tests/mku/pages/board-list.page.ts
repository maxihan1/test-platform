import type { Locator, Page } from '@playwright/test';

export interface 목록열기조건 {
  category?: string;
  field?: string;
  q?: string;
  sort?: string;
  page?: number;
}

export interface 목록행 {
  번호: string;
  분류: string;
  제목: string;
  댓글수: string;
  작성자: string;
  작성일: string;
  조회수: number;
  좋아요: number;
}

function 행으로(줄: string): 목록행 {
  const 칸 = 줄.split('\t');
  const 제목칸 = /^([\s\S]*?)(?:\[(\d+)\])?$/.exec(칸[2] ?? '');
  return {
    번호: 칸[0] ?? '',
    분류: 칸[1] ?? '',
    제목: 제목칸?.[1] ?? '',
    댓글수: 제목칸?.[2] ?? '',
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
  readonly 글쓰기: Locator;
  readonly 표: Locator;
  readonly 표머리칸: Locator;
  readonly 행들: Locator;
  readonly 공지행: Locator;
  readonly 일반행: Locator;
  readonly 공지표시: Locator;
  readonly 결과없음: Locator;
  readonly 표자리: Locator;
  readonly 표자리안내: Locator;
  readonly 실패안내: Locator;
  readonly 페이저: Locator;
  readonly 이전: Locator;
  readonly 다음: Locator;
  readonly 번호버튼들: Locator;
  readonly 머리글붙음: Locator;
  readonly 머리글안쪽: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { name: '커뮤니티', level: 1 });
    this.분류탭들 = page.getByRole('tablist', { name: '분류' });
    this.검색폼 = page.getByRole('search');
    this.검색조건 = this.검색폼.getByLabel('검색 조건');
    this.검색어 = this.검색폼.getByRole('searchbox', { name: '검색어' });
    this.검색 = this.검색폼.getByRole('button', { name: '검색', exact: true });
    this.정렬 = page.getByLabel('정렬', { exact: true });
    this.글쓰기 = page.getByRole('main').getByRole('link', { name: '글쓰기', exact: true });
    this.표 = page.getByRole('table');
    this.표머리칸 = this.표.getByRole('columnheader');
    this.행들 = this.표.getByRole('row');
    this.공지표시 = page.getByText('공지', { exact: true });
    const 글이든행 = this.행들.filter({ has: page.getByRole('link') });
    this.공지행 = 글이든행.filter({ has: this.공지표시 });
    this.일반행 = 글이든행.filter({ hasNot: this.공지표시 });
    this.결과없음 = page.getByText('검색 결과가 없습니다', { exact: true });
    this.표자리 = page.getByRole('tabpanel');
    this.표자리안내 = this.표자리.getByRole('paragraph');
    this.실패안내 = this.표자리.getByText('잠시 후 다시 시도해 주세요', { exact: true });
    this.페이저 = page.getByRole('navigation', { name: '페이지' });
    this.이전 = this.페이저.getByRole('button', { name: '이전', exact: true });
    this.다음 = this.페이저.getByRole('button', { name: '다음', exact: true });
    this.번호버튼들 = this.페이저.getByRole('button', { name: /^\d+$/ });
    this.머리글붙음 = page.locator('#site-header.stuck');
    this.머리글안쪽 = page.locator('#site-header .header-inner');
  }

  async 열기(조건: 목록열기조건 = {}): Promise<void> {
    const 값 = new URLSearchParams();
    if (조건.category !== undefined) 값.set('category', 조건.category);
    if (조건.q !== undefined) {
      값.set('field', 조건.field ?? 'title');
      값.set('q', 조건.q);
    }
    if (조건.sort !== undefined) 값.set('sort', 조건.sort);
    if (조건.page !== undefined) 값.set('page', String(조건.page));
    const 글 = 값.toString();
    await this.page.goto(글 === '' ? 게시판목록화면.주소 : `${게시판목록화면.주소}?${글}`);
  }

  async 그려질때까지(): Promise<void> {
    await this.일반행.first().or(this.결과없음).first().waitFor();
  }

  분류탭(이름: string): Locator {
    return this.분류탭들.getByRole('tab', { name: 이름, exact: true });
  }

  선택된분류탭(이름: string): Locator {
    return this.분류탭들.getByRole('tab', { name: 이름, exact: true, selected: true });
  }

  번호버튼(번호: number): Locator {
    return this.페이저.getByRole('button', { name: String(번호), exact: true });
  }

  행(글자: string): Locator {
    return this.행들.filter({ hasText: 글자 });
  }

  제목링크(글자: string): Locator {
    return this.표.getByRole('link', { name: 글자 });
  }

  댓글수표시(글자: string): Locator {
    return this.행(글자).getByText(/^\[\d+\]$/);
  }

  async 검색하기(조건: '제목' | '내용' | '작성자', 글: string): Promise<void> {
    await this.검색조건.selectOption({ label: 조건 });
    await this.검색어.fill(글);
    await this.검색.click();
  }

  async 정렬고르기(이름: '최신순' | '조회순' | '좋아요순'): Promise<void> {
    await this.정렬.selectOption({ label: 이름 });
  }

  async 일반행들(): Promise<목록행[]> {
    return (await this.일반행.allInnerTexts()).map(행으로);
  }

  async 공지행들(): Promise<목록행[]> {
    return (await this.공지행.allInnerTexts()).map(행으로);
  }

  async 선택된정렬(): Promise<string> {
    return await this.정렬.evaluate((칸: HTMLSelectElement) => 칸.selectedOptions[0]?.text ?? '');
  }

  async 공지가맨위인가(): Promise<boolean> {
    const 마지막공지 = await this.공지행.last().boundingBox();
    const 첫일반 = await this.일반행.first().boundingBox();
    return (await this.공지행.count()) > 0 && 마지막공지 !== null && (첫일반 === null || 마지막공지.y < 첫일반.y);
  }

  async 첫글열기(): Promise<void> {
    await this.일반행.first().getByRole('link').click();
  }

  async 현재페이지(): Promise<string | undefined> {
    for (const 버튼 of await this.번호버튼들.all()) {
      if ((await 버튼.getAttribute('aria-current')) === 'page') return (await 버튼.innerText()).trim();
    }
    return undefined;
  }

  async 내리기(픽셀: number): Promise<void> {
    await this.page.evaluate((y) => {
      window.scrollTo(0, y);
    }, 픽셀);
    await this.page.evaluate(() => new Promise<void>((끝) => requestAnimationFrame(() => requestAnimationFrame(() => 끝()))));
  }

  async 내린만큼(): Promise<number> {
    return await this.page.evaluate(() => window.scrollY);
  }

  async 머리글높이(): Promise<number | undefined> {
    await this.머리글안쪽.evaluate((요소) => Promise.allSettled(요소.getAnimations().map((움직임) => 움직임.finished)));
    return (await this.머리글안쪽.boundingBox())?.height;
  }
}
