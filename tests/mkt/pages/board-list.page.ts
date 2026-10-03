import type { Locator, Page } from '@playwright/test';

export class 게시판목록화면 {
  constructor(private readonly page: Page) {}

  async 열기(조건?: Record<string, string>): Promise<void> {
    const 쿼리 = 조건 === undefined ? '' : new URLSearchParams(조건).toString();
    await this.page.goto(쿼리 === '' ? '/board' : `/board?${쿼리}`);
  }

  제목(): Locator {
    return this.page.getByRole('heading', { name: '커뮤니티', exact: true });
  }

  분류탭(이름: string): Locator {
    return this.page.getByRole('tab', { name: 이름, exact: true });
  }

  표(): Locator {
    return this.page.getByRole('table');
  }

  열머리글(이름: string): Locator {
    return this.표().getByRole('columnheader', { name: 이름, exact: true });
  }

  검색조건선택(): Locator {
    return this.page.getByLabel('검색 조건', { exact: true });
  }

  검색어칸(): Locator {
    return this.page.getByLabel('검색어', { exact: true });
  }

  검색버튼(): Locator {
    return this.page.getByRole('button', { name: '검색', exact: true });
  }

  정렬선택(): Locator {
    return this.page.getByLabel('정렬', { exact: true });
  }

  검색조건선택지(): Locator {
    return this.검색조건선택().getByRole('option');
  }

  정렬선택지(): Locator {
    return this.정렬선택().getByRole('option');
  }

  선택된정렬(): Locator {
    return this.정렬선택().locator('option:checked');
  }

  글쓰기링크(): Locator {
    return this.page.getByRole('link', { name: '글쓰기', exact: true });
  }

  쪽번호영역(): Locator {
    return this.page.getByRole('navigation', { name: '페이지', exact: true });
  }

  쪽버튼(번호: number): Locator {
    return this.쪽번호영역().getByRole('button', { name: String(번호), exact: true });
  }

  이전버튼(): Locator {
    return this.쪽번호영역().getByRole('button', { name: '이전', exact: true });
  }

  다음버튼(): Locator {
    return this.쪽번호영역().getByRole('button', { name: '다음', exact: true });
  }

  검색결과없음문구(): Locator {
    return this.page.getByText('검색 결과가 없습니다', { exact: true });
  }

  글줄(): Locator {
    return this.page.getByRole('row').filter({ has: this.page.getByRole('link') });
  }

  공지줄(): Locator {
    return this.글줄().filter({ has: this.page.getByText('공지', { exact: true }) });
  }

  일반글줄(): Locator {
    return this.글줄().filter({ hasNot: this.page.getByText('공지', { exact: true }) });
  }

  글줄찾기(제목: string): Locator {
    return this.글줄().filter({ has: this.page.getByRole('link', { name: 제목, exact: true }) });
  }

  제목링크(제목: string): Locator {
    return this.page.getByRole('link', { name: 제목, exact: true });
  }

  댓글수표시(제목: string): Locator {
    return this.글줄찾기(제목).getByText(/^\[\d+\]$/);
  }

  분류칸(줄: Locator): Locator {
    return 줄.locator('td:nth-child(2)');
  }

  작성일칸(줄: Locator): Locator {
    return 줄.locator('td:nth-child(5)');
  }

  조회수칸(줄: Locator): Locator {
    return 줄.locator('td:nth-child(6)');
  }

  좋아요칸(줄: Locator): Locator {
    return 줄.locator('td:nth-child(7)');
  }

  제목칸(줄: Locator): Locator {
    return 줄.locator('td:nth-child(3)');
  }

  작성자칸(줄: Locator): Locator {
    return 줄.locator('td:nth-child(4)');
  }

  async 첫글열기(): Promise<void> {
    await this.일반글줄().first().getByRole('link').click();
  }

  async 분류고르기(이름: string): Promise<void> {
    await this.분류탭(이름).click();
  }

  async 검색하기(조건: string, 검색어: string): Promise<void> {
    await this.검색조건선택().selectOption({ label: 조건 });
    await this.검색어칸().fill(검색어);
    await this.검색버튼().click();
  }

  async 정렬고르기(이름: string): Promise<void> {
    await this.정렬선택().selectOption({ label: 이름 });
  }
}
