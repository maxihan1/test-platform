import type { Locator, Page, Response } from '@playwright/test';

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
  readonly 임시저장: Locator;
  readonly 등록: Locator;
  readonly 알림: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { name: '글쓰기', level: 1 });
    this.분류 = page.getByLabel(/^분류/);
    this.제목칸 = page.getByLabel(/^제목/);
    this.본문칸 = page.getByLabel(/^본문/);
    this.임시저장 = page.getByRole('button', { name: '임시 저장', exact: true });
    this.등록 = page.getByRole('button', { name: '등록', exact: true });
    this.알림 = page.getByRole('status');
  }

  async 열기(): Promise<void> {
    await this.page.goto(글쓰기화면.주소);
  }

  async 채우기(입력: 글쓰기입력): Promise<void> {
    if (입력.분류 !== undefined) await this.분류.selectOption({ label: 입력.분류 });
    if (입력.제목 !== undefined) await this.제목칸.fill(입력.제목);
    if (입력.본문 !== undefined) await this.본문칸.fill(입력.본문);
  }

  async 등록하고응답받기(): Promise<Response> {
    const 응답 = this.page.waitForResponse((r) => new URL(r.url()).pathname === '/api/posts' && r.request().method() === 'POST');
    await this.등록.click();
    return await 응답;
  }

  알림글(문구: string): Locator {
    return this.알림.getByText(문구, { exact: true });
  }
}
