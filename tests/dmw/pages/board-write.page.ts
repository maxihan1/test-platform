import type { Locator, Page } from '@playwright/test';

export interface 글쓰기내용 {
  분류?: string;
  제목?: string;
  본문?: string;
}

export interface 올릴파일 {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

export class 글쓰기화면 {
  static readonly 주소 = '/board/write';

  readonly 큰제목: Locator;
  readonly 수정큰제목: Locator;
  readonly 분류: Locator;
  readonly 제목칸: Locator;
  readonly 본문칸: Locator;
  readonly 제목글자수: Locator;
  readonly 본문글자수: Locator;
  readonly 이미지칸: Locator;
  readonly 미리보기들: Locator;
  readonly 미리보기빼기들: Locator;
  readonly 임시저장: Locator;
  readonly 취소: Locator;
  readonly 등록: Locator;

  constructor(private readonly page: Page) {
    this.큰제목 = page.getByRole('heading', { level: 1, name: '글쓰기', exact: true });
    this.수정큰제목 = page.getByRole('heading', { level: 1, name: '게시글 수정', exact: true });
    this.분류 = page.getByRole('combobox', { name: '분류' });
    this.제목칸 = page.getByRole('textbox', { name: '제목' });
    this.본문칸 = page.getByRole('textbox', { name: '본문' });
    this.제목글자수 = page.getByText(/^\d+\/50$/);
    this.본문글자수 = page.getByText(/^\d+\/2000$/);
    this.이미지칸 = page.getByLabel('이미지 첨부');
    this.미리보기들 = page.getByRole('img', { name: /^첨부 이미지 \d+$/ });
    this.미리보기빼기들 = page.getByRole('button', { name: '이미지 빼기', exact: true });
    this.임시저장 = page.getByRole('button', { name: '임시 저장', exact: true });
    this.취소 = page.getByRole('link', { name: '취소', exact: true });
    this.등록 = page.getByRole('button', { name: '등록', exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto(글쓰기화면.주소);
    await this.그려질때까지();
  }

  async 수정열기(번호: number): Promise<void> {
    await this.page.goto(`/board/${번호}/edit`);
    await this.그려질때까지();
  }

  async 그려질때까지(): Promise<void> {
    await this.page.waitForFunction(() => {
      const 폼 = document.querySelector('#post-form');
      return 폼 !== null && !폼.hasAttribute('aria-busy');
    });
  }

  async 채우기(내용: 글쓰기내용): Promise<void> {
    if (내용.분류 !== undefined) await this.분류.selectOption({ label: 내용.분류 });
    if (내용.제목 !== undefined) await this.제목칸.fill(내용.제목);
    if (내용.본문 !== undefined) await this.본문칸.fill(내용.본문);
  }

  async 파일고르기(파일들: 올릴파일[]): Promise<void> {
    await this.이미지칸.setInputFiles(파일들);
  }

  async 분류목록(): Promise<string[]> {
    return this.분류.getByRole('option').allInnerTexts();
  }

  async 미리보기수가될때까지(개수: number): Promise<void> {
    await this.page.waitForFunction((n) => document.querySelectorAll('.previews .preview').length === n, 개수);
  }

  async 미리보기주소들(): Promise<string[]> {
    return this.미리보기들.evaluateAll((그림들) => 그림들.map((그림) => (그림 as HTMLImageElement).src));
  }
}
