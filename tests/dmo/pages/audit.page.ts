import type { Locator, Page, Response } from '@playwright/test';

import { 운영틀 } from '../components/ops-frame.component.js';

const 열번호 = { 시각: 1, 운영자: 2, 메뉴: 3, 대상: 4, 내용: 5 } as const;

export class 변경기록화면 {
  static readonly 주소 = '/ops/audit';
  readonly 틀: 운영틀;
  readonly 제목: Locator;
  readonly 메뉴: Locator;
  readonly 검색칸: Locator;
  readonly 총건수: Locator;
  readonly 표: Locator;
  readonly 줄들: Locator;

  constructor(readonly page: Page) {
    this.틀 = new 운영틀(page);
    this.제목 = this.틀.본문.getByRole('heading', { name: '변경 기록', level: 1 });
    this.메뉴 = this.틀.본문.getByRole('combobox', { name: /^메뉴/ });
    this.검색칸 = this.틀.본문.getByLabel('검색', { exact: true });
    this.총건수 = this.틀.본문.getByText(/^총 [\d,]+건$/);
    this.표 = this.틀.본문.getByRole('table');
    this.줄들 = this.표.getByRole('row').filter({ has: page.getByRole('cell') });
  }

  async 열기(): Promise<void> {
    await this.page.goto(변경기록화면.주소);
    await this.틀.다그려질때까지();
  }

  칸들(열: keyof typeof 열번호): Locator {
    return this.줄들.locator(`td:nth-child(${열번호[열]})`);
  }

  대상줄(대상: string): Locator {
    return this.줄들.filter({ has: this.page.getByRole('cell', { name: 대상, exact: true }) });
  }

  private 목록응답인가(응답: Response): boolean {
    return new URL(응답.url()).pathname === '/api/ops/audit' && 응답.request().method() === 'GET';
  }

  private async 총건수그려질때까지(응답: Response): Promise<void> {
    const { total } = (await 응답.json()) as { total: number };
    await this.총건수.filter({ hasText: `총 ${total}건` }).waitFor();
  }

  async 검색하기(글자: string): Promise<void> {
    const 응답 = this.page.waitForResponse((r) => this.목록응답인가(r) && new URL(r.url()).searchParams.get('q') === 글자);
    await this.검색칸.fill(글자);
    await this.총건수그려질때까지(await 응답);
  }

  async 메뉴고르기(이름: string): Promise<void> {
    const 응답 = this.page.waitForResponse((r) => this.목록응답인가(r) && new URL(r.url()).searchParams.get('area') === 이름);
    await this.메뉴.selectOption({ label: 이름 });
    await this.총건수그려질때까지(await 응답);
  }
}
