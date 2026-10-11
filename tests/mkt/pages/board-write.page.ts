import type { Locator, Page, Response } from '@playwright/test';

import type { 올릴파일 } from '../helpers/files.helper.js';

export interface 글쓰기입력 {
  분류?: string;
  제목?: string;
  본문?: string;
}

export class 글쓰기화면 {
  static readonly 주소 = '/board/write';

  readonly 제목: Locator;
  readonly 분류: Locator;
  readonly 제목칸: Locator;
  readonly 본문칸: Locator;
  readonly 제목글자수: Locator;
  readonly 본문글자수: Locator;
  readonly 이미지칸: Locator;
  readonly 미리보기들: Locator;
  readonly 이미지빼기: Locator;
  readonly 임시저장: Locator;
  readonly 취소: Locator;
  readonly 등록: Locator;
  readonly 준비중: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { level: 1 });
    this.분류 = page.getByLabel(/^분류/);
    this.제목칸 = page.getByLabel(/^제목/);
    this.본문칸 = page.getByLabel(/^본문/);
    this.제목글자수 = page.getByText(/^\d+\/50$/);
    this.본문글자수 = page.getByText(/^\d+\/2000$/);
    this.이미지칸 = page.getByLabel(/^이미지 첨부/);
    this.미리보기들 = page.getByLabel('첨부한 이미지').getByRole('img');
    this.이미지빼기 = page.getByRole('button', { name: '이미지 빼기', exact: true });
    this.임시저장 = page.getByRole('button', { name: '임시 저장', exact: true });
    this.취소 = page.getByRole('link', { name: '취소', exact: true });
    this.등록 = page.getByRole('button', { name: '등록', exact: true });
    this.준비중 = page.locator('form[aria-busy="true"]');
  }

  async 열기(): Promise<void> {
    await this.page.goto(글쓰기화면.주소);
  }

  async 수정열기(글번호: number): Promise<void> {
    await this.page.goto(`/board/${String(글번호)}/edit`);
  }

  async 준비될때까지(): Promise<void> {
    await this.제목칸.waitFor();
    await this.준비중.waitFor({ state: 'detached' });
  }

  async 채우기(입력: 글쓰기입력): Promise<void> {
    if (입력.분류 !== undefined) await this.분류.selectOption({ label: 입력.분류 });
    if (입력.제목 !== undefined) await this.제목칸.fill(입력.제목);
    if (입력.본문 !== undefined) await this.본문칸.fill(입력.본문);
  }

  async 분류항목들(): Promise<string[]> {
    return await this.분류.getByRole('option').allInnerTexts();
  }

  async 등록하고응답받기(): Promise<Response> {
    const 응답 = this.page.waitForResponse((r) => new URL(r.url()).pathname === '/api/posts' && r.request().method() === 'POST');
    await this.등록.click();
    return await 응답;
  }

  async 두번누르기(): Promise<void> {
    await this.등록.dblclick();
  }

  async 이미지고르기(...파일들: 올릴파일[]): Promise<void> {
    await this.이미지칸.setInputFiles(파일들);
  }
}
