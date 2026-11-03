import type { Locator, Page, Response } from '@playwright/test';

import { 운영틀 } from '../components/ops-frame.component.js';

export type 문의상태 = '전체' | '답변 대기' | '답변 완료';

export class 문의관리화면 {
  static readonly 주소 = '/ops/inquiries';
  readonly 틀: 운영틀;
  readonly 제목: Locator;
  readonly 상태고르기: Locator;
  readonly 총건수: Locator;
  readonly 표: Locator;
  readonly 빈안내: Locator;
  readonly 상태칸들: Locator;
  readonly 문의창: Locator;
  readonly 답변칸: Locator;
  readonly 답변저장: Locator;
  readonly 창닫기: Locator;

  constructor(readonly page: Page) {
    this.틀 = new 운영틀(page);
    this.제목 = page.getByRole('heading', { name: '문의 관리', level: 1 });
    this.상태고르기 = page.getByRole('combobox', { name: '상태' });
    this.총건수 = page.getByText(/^총 \d+건$/);
    this.표 = this.틀.본문.getByRole('table');
    this.빈안내 = this.틀.본문.getByText('문의가 없습니다');
    this.상태칸들 = this.표.getByRole('cell', { name: /^답변 (대기|완료)$/ });
    this.문의창 = this.틀.확인창;
    this.답변칸 = this.문의창.getByRole('textbox', { name: '답변', exact: true });
    this.답변저장 = this.틀.창버튼('답변 저장');
    this.창닫기 = this.문의창.locator('.modal-foot').getByRole('button', { name: '닫기', exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto(문의관리화면.주소);
    await this.틀.다그려질때까지();
    await this.표.or(this.빈안내).waitFor();
  }

  열머리(name: string): Locator {
    return this.표.getByRole('columnheader', { name, exact: true });
  }

  줄(title: string): Locator {
    return this.표.getByRole('row').filter({ has: this.page.getByRole('cell', { name: title, exact: true }) });
  }

  줄상태(title: string): Locator {
    return this.줄(title).getByRole('cell', { name: /^답변 (대기|완료)$/ });
  }

  줄버튼(title: string, name: '답변하기' | '답변 고치기'): Locator {
    return this.줄(title).getByRole('button', { name, exact: true });
  }

  async 총건수읽기(): Promise<number> {
    return Number((await this.총건수.innerText()).replace(/\D/g, ''));
  }

  async 상태고르기하기(상태: 문의상태): Promise<void> {
    const 응답 = this.page.waitForResponse((r) => r.request().method() === 'GET' && new URL(r.url()).pathname === '/api/ops/inquiries');
    await this.상태고르기.selectOption(상태);
    await this.그려질때까지(응답);
  }

  async 답변창열기(title: string, 버튼: '답변하기' | '답변 고치기'): Promise<void> {
    await this.줄버튼(title, 버튼).click();
    await this.답변칸.waitFor();
    await this.page.waitForFunction(() => document.activeElement?.closest('[role="dialog"]') != null);
  }

  async 답변저장누르기(): Promise<void> {
    const 응답 = this.page.waitForResponse((r) => r.request().method() === 'PUT' && /^\/api\/ops\/inquiries\/\d+\/answer$/.test(new URL(r.url()).pathname));
    await this.답변저장.click();
    await 응답;
  }

  async 창닫기누르기(): Promise<void> {
    await this.창닫기.click();
    await this.문의창.waitFor({ state: 'hidden' });
  }

  private async 그려질때까지(응답: Promise<Response>): Promise<void> {
    await (await 응답).finished();
    await this.page.evaluate(() => new Promise<void>((끝) => requestAnimationFrame(() => requestAnimationFrame(() => 끝()))));
  }
}
