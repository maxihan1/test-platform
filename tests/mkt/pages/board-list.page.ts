import type { Locator, Page } from '@playwright/test';

import { 토스트 } from '../components/feedback.component.js';

export interface 목록행 {
  공지: boolean;
  번호: string;
  분류: string;
  제목: string;
  댓글수: string;
  작성자: string;
  작성일: string;
  조회수: number;
  좋아요: number;
}

export class 게시판목록화면 {
  readonly 토스트: 토스트;
  readonly 분류탭목록: Locator;
  readonly 검색조건: Locator;
  readonly 검색어: Locator;
  readonly 검색버튼: Locator;
  readonly 정렬: Locator;
  readonly 글쓰기링크: Locator;
  readonly 표: Locator;
  readonly 표머리칸: Locator;
  readonly 행들: Locator;
  readonly 공지행들: Locator;
  readonly 일반행들: Locator;
  readonly 빈결과: Locator;
  readonly 페이지이동: Locator;
  readonly 이전버튼: Locator;
  readonly 다음버튼: Locator;
  readonly 현재쪽: Locator;

  constructor(private readonly page: Page) {
    this.토스트 = new 토스트(page);
    this.분류탭목록 = page.getByRole('tablist', { name: '분류' });
    this.검색조건 = page.getByRole('combobox', { name: '검색 조건' });
    this.검색어 = page.getByRole('searchbox', { name: '검색어' });
    this.검색버튼 = page.getByRole('button', { name: '검색', exact: true });
    this.정렬 = page.getByRole('combobox', { name: '정렬' });
    this.글쓰기링크 = page.getByRole('link', { name: '글쓰기', exact: true });
    this.표 = page.getByRole('table');
    this.표머리칸 = this.표.getByRole('columnheader');
    this.행들 = this.표.getByRole('row').filter({ has: page.getByRole('link') });
    this.공지행들 = this.행들.filter({ has: page.getByText('공지', { exact: true }) });
    this.일반행들 = this.행들.filter({ hasNot: page.getByText('공지', { exact: true }) });
    this.빈결과 = page.getByText('검색 결과가 없습니다', { exact: true });
    this.페이지이동 = page.getByRole('navigation', { name: '페이지' });
    this.이전버튼 = this.페이지이동.getByRole('button', { name: '이전', exact: true });
    this.다음버튼 = this.페이지이동.getByRole('button', { name: '다음', exact: true });
    this.현재쪽 = this.페이지이동.locator('button[aria-current="page"]');
  }

  async 열기(쿼리: string = ''): Promise<void> {
    await this.page.goto(쿼리 === '' ? '/board' : `/board?${쿼리}`);
    await this.표기다리기();
  }

  async 표기다리기(): Promise<void> {
    await this.행들.or(this.빈결과).first().waitFor();
  }

  탭(이름: string): Locator {
    return this.분류탭목록.getByRole('tab', { name: 이름, exact: true });
  }

  선택된탭(이름: string): Locator {
    return this.분류탭목록.getByRole('tab', { name: 이름, exact: true, selected: true });
  }

  쪽버튼(번호: number): Locator {
    return this.페이지이동.getByRole('button', { name: String(번호), exact: true });
  }

  행(제목: string): Locator {
    return this.행들.filter({ has: this.page.getByRole('link', { name: 제목, exact: true }) });
  }

  댓글수표시(제목: string): Locator {
    return this.행(제목).getByText(/^\[\d+\]$/);
  }

  async 글열기(제목: string): Promise<void> {
    await this.행(제목).getByRole('link', { name: 제목, exact: true }).click();
  }

  async 탭누르고기다리기(이름: string): Promise<void> {
    await this.탭(이름).click();
    await this.표기다리기();
  }

  async 쪽누르고기다리기(번호: number): Promise<void> {
    await this.쪽버튼(번호).click();
    await this.현재쪽.filter({ hasText: new RegExp(`^${번호}$`) }).waitFor();
    await this.표기다리기();
  }

  async 정렬고르고기다리기(이름: string): Promise<void> {
    await this.정렬.selectOption({ label: 이름 });
    await this.표기다리기();
  }

  async 검색하기(조건: string, 글: string): Promise<void> {
    await this.검색조건.selectOption({ label: 조건 });
    await this.검색어.fill(글);
    await this.검색버튼.click();
  }

  async 검색하고기다리기(조건: string, 글: string): Promise<void> {
    await this.검색하기(조건, 글);
    await this.표기다리기();
  }

  async 새로고침하고기다리기(): Promise<void> {
    await this.page.reload();
    await this.표기다리기();
  }

  async 행읽기(): Promise<목록행[]> {
    return this.행들.evaluateAll((줄들) =>
      줄들.map((줄) => {
        const 칸 = Array.from(줄.querySelectorAll('td')).map((td) => td.textContent?.trim() ?? '');
        const 제목칸 = 줄.querySelector('td.title');
        const 댓글수 = 제목칸?.querySelector('.cmt-count')?.textContent?.trim() ?? '';
        return {
          공지: 줄.classList.contains('notice'),
          번호: 칸[0] ?? '',
          분류: 칸[1] ?? '',
          제목: 제목칸?.querySelector('a')?.textContent?.trim() ?? '',
          댓글수,
          작성자: 칸[3] ?? '',
          작성일: 칸[4] ?? '',
          조회수: Number(칸[5]),
          좋아요: Number(칸[6]),
        };
      }),
    );
  }

  async 일반글읽기(): Promise<목록행[]> {
    return (await this.행읽기()).filter((행) => !행.공지);
  }

  async 탭글자들읽기(): Promise<string[]> {
    return this.분류탭목록.getByRole('tab').allInnerTexts();
  }

  async 표머리글자들읽기(): Promise<string[]> {
    return this.표머리칸.allInnerTexts();
  }

  async 정렬옵션글자들읽기(): Promise<string[]> {
    return this.정렬.getByRole('option').allInnerTexts();
  }

  async 선택한탭읽기(): Promise<string> {
    return (await this.분류탭목록.getByRole('tab', { selected: true }).innerText()).trim();
  }

  async 정렬글자읽기(): Promise<string> {
    return this.정렬.evaluate((상자) => (상자 as HTMLSelectElement).selectedOptions[0]?.textContent?.trim() ?? '');
  }

  async 쪽번호들읽기(): Promise<number[]> {
    const 글들 = await this.페이지이동.getByRole('button').allInnerTexts();
    return 글들.map((글) => Number(글.trim())).filter((수) => Number.isInteger(수) && 수 > 0);
  }

  async 현재쪽읽기(): Promise<number> {
    return Number((await this.현재쪽.innerText()).trim());
  }

  async 상태읽기(): Promise<{ 탭: string; 정렬: string; 쪽: number; 검색어: string; 제목들: string[] }> {
    return {
      탭: await this.선택한탭읽기(),
      정렬: await this.정렬글자읽기(),
      쪽: await this.현재쪽읽기(),
      검색어: await this.검색어.inputValue(),
      제목들: (await this.행읽기()).map((행) => 행.제목),
    };
  }

  async 뒤로가기하고기다리기(쪽: number): Promise<void> {
    await this.page.goBack();
    await this.현재쪽.filter({ hasText: new RegExp(`^${쪽}$`) }).waitFor();
    await this.표기다리기();
  }
}
