import type { Locator, Page } from '@playwright/test';

export interface 목록행 {
  공지: boolean;
  번호: string;
  분류: string;
  제목: string;
  댓글표시: string;
  작성자: string;
  작성일: string;
  조회수: number;
  좋아요: number;
}

export interface 목록조건 {
  분류?: string;
  검색조건?: string;
  검색어?: string;
  정렬?: string;
  쪽?: number;
}

export class 게시판목록화면 {
  static readonly 주소 = '/board';

  readonly 큰제목: Locator;
  readonly 탭들: Locator;
  readonly 검색조건: Locator;
  readonly 검색어칸: Locator;
  readonly 검색버튼: Locator;
  readonly 정렬: Locator;
  readonly 글쓰기: Locator;
  readonly 표: Locator;
  readonly 표머리칸들: Locator;
  readonly 공지표시: Locator;
  readonly 빈안내: Locator;
  readonly 본문영역: Locator;
  readonly 쪽이동: Locator;
  readonly 이전: Locator;
  readonly 다음: Locator;
  readonly 쪽버튼들: Locator;

  constructor(private readonly page: Page) {
    this.큰제목 = page.getByRole('heading', { level: 1, name: '커뮤니티', exact: true });
    this.탭들 = page.getByRole('tab');
    this.검색조건 = page.getByRole('combobox', { name: '검색 조건', exact: true });
    this.검색어칸 = page.getByRole('searchbox', { name: '검색어', exact: true });
    this.검색버튼 = page.getByRole('button', { name: '검색', exact: true });
    this.정렬 = page.getByRole('combobox', { name: '정렬', exact: true });
    this.글쓰기 = page.getByRole('link', { name: '글쓰기', exact: true });
    this.표 = page.getByRole('table');
    this.표머리칸들 = this.표.getByRole('columnheader');
    this.공지표시 = this.표.getByText('공지', { exact: true });
    this.빈안내 = page.getByText('검색 결과가 없습니다', { exact: true });
    this.본문영역 = page.getByRole('tabpanel');
    this.쪽이동 = page.getByRole('navigation', { name: '페이지', exact: true });
    this.이전 = this.쪽이동.getByRole('button', { name: '이전', exact: true });
    this.다음 = this.쪽이동.getByRole('button', { name: '다음', exact: true });
    this.쪽버튼들 = this.쪽이동.getByRole('button', { name: /^\d+$/ });
  }

  탭(이름: string): Locator {
    return this.page.getByRole('tab', { name: 이름, exact: true });
  }

  쪽(번호: number): Locator {
    return this.쪽이동.getByRole('button', { name: String(번호), exact: true });
  }

  제목링크(제목: string): Locator {
    return this.표.getByRole('link', { name: 제목, exact: true });
  }

  async 열기(조건: 목록조건 = {}): Promise<void> {
    const 질의 = new URLSearchParams();
    if (조건.분류 !== undefined) 질의.set('category', 조건.분류);
    if (조건.검색어 !== undefined) {
      질의.set('field', 조건.검색조건 ?? 'title');
      질의.set('q', 조건.검색어);
    }
    if (조건.정렬 !== undefined) 질의.set('sort', 조건.정렬);
    if (조건.쪽 !== undefined) 질의.set('page', String(조건.쪽));
    const 꼬리 = 질의.toString();
    await this.page.goto(꼬리 === '' ? 게시판목록화면.주소 : `${게시판목록화면.주소}?${꼬리}`);
    await this.그려질때까지();
  }

  async 그려질때까지(): Promise<void> {
    await this.page.waitForFunction(() => {
      const 영역 = document.querySelector('#board');
      return 영역 !== null && !영역.hasAttribute('aria-busy') && 영역.children.length > 0;
    });
  }

  async 쪽번호가될때까지(번호: number): Promise<void> {
    await this.page.waitForFunction((n) => document.querySelector('.pager [aria-current="page"]')?.textContent === String(n), 번호);
  }

  async 탭누르기(이름: string): Promise<void> {
    await this.탭(이름).click();
    await this.그려질때까지();
  }

  async 쪽누르기(번호: number): Promise<void> {
    await this.쪽(번호).click();
    await this.쪽번호가될때까지(번호);
    await this.그려질때까지();
  }

  async 정렬고르기(이름: string): Promise<void> {
    await this.정렬.selectOption({ label: 이름 });
    await this.그려질때까지();
  }

  async 검색하기(검색어: string, 검색조건?: string): Promise<void> {
    if (검색조건 !== undefined) await this.검색조건.selectOption({ label: 검색조건 });
    await this.검색어칸.fill(검색어);
    await this.검색버튼.click();
  }

  async 마지막쪽번호(): Promise<number> {
    const 글들 = await this.쪽버튼들.allInnerTexts();
    return Math.max(...글들.map(Number));
  }

  async 선택된탭(): Promise<string> {
    const 이름들 = await this.탭들.evaluateAll((탭들) => 탭들.filter((탭) => 탭.getAttribute('aria-selected') === 'true').map((탭) => (탭.textContent ?? '').trim()));
    return 이름들.join(', ');
  }

  async 현재쪽(): Promise<string> {
    return (await this.쪽이동.locator('[aria-current="page"]').innerText()).trim();
  }

  async 행들(): Promise<목록행[]> {
    return this.표.locator('tbody tr').evaluateAll((줄들) =>
      줄들.map((줄) => {
        const 칸 = Array.from(줄.children).map((하나) => (하나 as HTMLElement).innerText.trim());
        return {
          공지: 줄.classList.contains('notice'),
          번호: 칸[0] ?? '',
          분류: 칸[1] ?? '',
          제목: 줄.querySelector('td.title a')?.textContent?.trim() ?? '',
          댓글표시: 줄.querySelector('.cmt-count')?.textContent?.trim() ?? '',
          작성자: 칸[3] ?? '',
          작성일: 칸[4] ?? '',
          조회수: Number(칸[5] ?? '0'),
          좋아요: Number(칸[6] ?? '0'),
        };
      }),
    );
  }

  async 일반행들(): Promise<목록행[]> {
    return (await this.행들()).filter((행) => !행.공지);
  }
}
