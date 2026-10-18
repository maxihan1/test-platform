import type { Locator, Page } from '@playwright/test';
import { 머리글 } from '../components/header.component.js';

export class 게시판목록화면 {
  static readonly 주소 = '/board';
  readonly 제목: Locator;
  readonly 탭목록: Locator;
  readonly 분류탭들: Locator;
  readonly 선택된탭: Locator;
  readonly 검색조건: Locator;
  readonly 검색어: Locator;
  readonly 검색버튼: Locator;
  readonly 정렬: Locator;
  readonly 정렬옵션들: Locator;
  readonly 선택된정렬: Locator;
  readonly 글쓰기링크: Locator;
  readonly 표: Locator;
  readonly 표머리칸들: Locator;
  readonly 글링크들: Locator;
  readonly 본문행: Locator;
  readonly 공지행: Locator;
  readonly 일반행: Locator;
  readonly 빈상태: Locator;
  readonly 쪽이동: Locator;
  readonly 쪽이동버튼들: Locator;
  readonly 이전: Locator;
  readonly 다음: Locator;
  readonly 현재쪽: Locator;
  readonly 머리글: 머리글;

  constructor(readonly page: Page) {
    const 본문 = page.locator('main');
    this.탭목록 = 본문.getByRole('tablist', { name: '분류' });
    this.제목 = page.getByRole('heading', { name: '커뮤니티', level: 1 });
    this.분류탭들 = this.탭목록.getByRole('tab');
    this.선택된탭 = this.탭목록.getByRole('tab', { selected: true });
    this.검색조건 = 본문.getByRole('combobox', { name: '검색 조건' });
    this.검색어 = 본문.getByRole('searchbox', { name: '검색어' });
    this.검색버튼 = 본문.getByRole('button', { name: '검색', exact: true });
    this.정렬 = 본문.getByRole('combobox', { name: '정렬' });
    this.정렬옵션들 = this.정렬.getByRole('option');
    this.선택된정렬 = this.정렬.getByRole('option', { selected: true });
    this.글쓰기링크 = 본문.getByRole('link', { name: '글쓰기', exact: true });
    this.표 = 본문.getByRole('table');
    this.표머리칸들 = this.표.getByRole('columnheader');
    this.글링크들 = this.표.getByRole('link');
    this.본문행 = this.표.getByRole('row').filter({ has: page.getByRole('cell') });
    this.공지행 = this.본문행.filter({ has: page.getByText('공지', { exact: true }) });
    this.일반행 = this.본문행.filter({ hasNot: page.getByText('공지', { exact: true }) });
    this.빈상태 = 본문.locator('#board .empty-state');
    this.쪽이동 = 본문.getByRole('navigation', { name: '페이지' });
    this.쪽이동버튼들 = this.쪽이동.getByRole('button');
    this.이전 = this.쪽이동.getByRole('button', { name: '이전', exact: true });
    this.다음 = this.쪽이동.getByRole('button', { name: '다음', exact: true });
    this.현재쪽 = this.쪽이동.locator('[aria-current="page"]');
    this.머리글 = new 머리글(page);
  }

  탭(이름: string): Locator {
    return this.탭목록.getByRole('tab', { name: 이름, exact: true });
  }

  쪽(번호: number): Locator {
    return this.쪽이동.getByRole('button', { name: String(번호), exact: true });
  }

  제목행(제목: string): Locator {
    return this.일반행.filter({ hasText: 제목 });
  }

  async 열기(): Promise<void> {
    await this.page.goto(게시판목록화면.주소);
    await this.제목.waitFor();
    await this.머리글.그려질때까지();
    await this.내용그려질때까지();
  }

  async 내용그려질때까지(): Promise<void> {
    await this.글링크들.first().or(this.빈상태).waitFor();
  }

  async 탭누르기(이름: string): Promise<void> {
    await this.탭(이름).click();
    await this.내용그려질때까지();
  }

  async 쪽누르기(번호: number): Promise<void> {
    await this.쪽(번호).click();
    await this.내용그려질때까지();
  }

  async 정렬고르기(이름: string): Promise<void> {
    await this.정렬.selectOption({ label: 이름 });
    await this.내용그려질때까지();
  }

  async 검색어넣고누르기(글: string): Promise<void> {
    await this.검색어.fill(글);
    await this.검색버튼.click();
  }

  async 검색하기(글: string): Promise<void> {
    await this.검색어넣고누르기(글);
    await this.내용그려질때까지();
  }

  async 조건으로검색하기(조건: string, 글: string): Promise<void> {
    await this.검색조건.selectOption({ label: 조건 });
    await this.검색하기(글);
  }

  async 행글자들(): Promise<string[][]> {
    return (await this.본문행.allInnerTexts()).map((글) => 글.split('\t'));
  }

  async 공지행글자들(): Promise<string[][]> {
    return (await this.공지행.allInnerTexts()).map((글) => 글.split('\t'));
  }

  async 일반행글자들(): Promise<string[][]> {
    return (await this.일반행.allInnerTexts()).map((글) => 글.split('\t'));
  }

  async 새로고침(): Promise<void> {
    await this.page.reload();
    await this.제목.waitFor();
    await this.머리글.그려질때까지();
    await this.내용그려질때까지();
  }

  async 제목칸글자(제목: string): Promise<string> {
    return ((await this.제목행(제목).innerText()).split('\t')[2]) ?? '';
  }

  async 탭이표위에있는가(): Promise<boolean> {
    const 탭상자 = await this.탭목록.boundingBox();
    const 표상자 = await this.표.boundingBox();
    return 탭상자 !== null && 표상자 !== null && 탭상자.y < 표상자.y;
  }
}
