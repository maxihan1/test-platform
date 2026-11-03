import type { Locator, Page, Response } from '@playwright/test';

import { 운영틀 } from '../components/ops-frame.component.js';

export interface 게시판줄 {
  번호: string;
  분류: string;
  제목: string;
  글쓴이: string;
  등록일: string;
  상태: string;
}

const 정규식글자 = (글: string): string => 글.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export class 운영게시판화면 {
  static readonly 주소 = '/ops/board';
  readonly 틀: 운영틀;
  readonly 제목: Locator;
  readonly 전체칩: Locator;
  readonly 보이는칩: Locator;
  readonly 숨긴칩: Locator;
  readonly 분류고르기: Locator;
  readonly 검색칸: Locator;
  readonly 공지쓰기버튼: Locator;
  readonly 표: Locator;
  readonly 빈안내: Locator;
  readonly 창: Locator;
  readonly 제목칸: Locator;
  readonly 본문칸: Locator;
  readonly 안내: Locator;
  readonly 등록: Locator;
  readonly 창닫기: Locator;
  readonly 댓글줄들: Locator;
  readonly 댓글창숨기기들: Locator;

  constructor(readonly page: Page) {
    this.틀 = new 운영틀(page);
    this.제목 = page.getByRole('heading', { name: '게시판', level: 1 });
    this.전체칩 = page.getByRole('button', { name: /^전체 \d+$/ });
    this.보이는칩 = page.getByRole('button', { name: /^보이는 글 \d+$/ });
    this.숨긴칩 = page.getByRole('button', { name: /^숨긴 글 \d+$/ });
    this.분류고르기 = page.getByRole('combobox', { name: '분류' });
    this.검색칸 = page.getByRole('searchbox', { name: '검색' });
    this.공지쓰기버튼 = page.getByRole('button', { name: '공지 쓰기', exact: true });
    this.표 = this.틀.본문.getByRole('table');
    this.빈안내 = this.틀.본문.getByText('조건에 맞는 글이 없습니다');
    this.창 = this.틀.확인창;
    this.제목칸 = this.창.getByRole('textbox', { name: '제목 (2~50자)', exact: true });
    this.본문칸 = this.창.getByRole('textbox', { name: '본문 (10~2000자)', exact: true });
    this.안내 = this.창.getByRole('alert');
    this.등록 = this.틀.창버튼('등록');
    this.창닫기 = this.창.locator('.modal-foot').getByRole('button', { name: '닫기', exact: true });
    this.댓글줄들 = this.창.getByRole('listitem');
    this.댓글창숨기기들 = this.창.getByRole('button', { name: '숨기기', exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto(운영게시판화면.주소);
    await this.틀.다그려질때까지();
    await this.표.or(this.빈안내).waitFor();
  }

  열머리(name: string): Locator {
    return this.표.getByRole('columnheader', { name, exact: true });
  }

  줄(title: string): Locator {
    const 제목셀 = this.page.getByRole('cell', { name: new RegExp(`^${정규식글자(title)}( ↗)?$`) });
    return this.표.getByRole('row').filter({ has: 제목셀 });
  }

  줄버튼(title: string, name: string | RegExp): Locator {
    return this.줄(title).getByRole('button', { name, exact: typeof name === 'string' });
  }

  제목링크(title: string): Locator {
    return this.표.getByRole('link', { name: `${title} ↗`, exact: true });
  }

  async 줄들(): Promise<게시판줄[]> {
    const 칸들 = (await this.표.getByRole('cell').allInnerTexts()).map((글) => 글.trim());
    const 줄: 게시판줄[] = [];
    for (let i = 0; i + 6 < 칸들.length; i += 7) {
      줄.push({ 번호: 칸들[i], 분류: 칸들[i + 1], 제목: 칸들[i + 2].replace(/ ↗$/, ''), 글쓴이: 칸들[i + 3], 등록일: 칸들[i + 4], 상태: 칸들[i + 5] });
    }
    return 줄;
  }

  async 칩건수(칩: Locator): Promise<number> {
    return Number((await 칩.innerText()).replace(/\D/g, ''));
  }

  async 숨긴글칩누르기(): Promise<void> {
    await this.숨긴칩.click();
    await this.page.getByRole('button', { name: /^숨긴 글 \d+$/, pressed: true }).waitFor();
  }

  async 분류고르기하기(분류: string): Promise<void> {
    const 응답 = this.page.waitForResponse((r) => r.request().method() === 'GET' && new URL(r.url()).pathname === '/api/ops/posts');
    await this.분류고르기.selectOption(분류);
    await this.그려질때까지(응답);
  }

  async 검색하기(글: string): Promise<void> {
    const 응답 = this.page.waitForResponse((r) => {
      const 주소 = new URL(r.url());
      return r.request().method() === 'GET' && 주소.pathname === '/api/ops/posts' && 주소.searchParams.get('q') === 글;
    });
    await this.검색칸.fill(글);
    await this.그려질때까지(응답);
  }

  async 숨기기토글누르기(title: string, 버튼: '숨기기' | '다시 보이기'): Promise<void> {
    const 응답 = this.page.waitForResponse((r) => r.request().method() === 'PUT' && /^\/api\/ops\/posts\/\d+\/hidden$/.test(new URL(r.url()).pathname));
    await this.줄버튼(title, 버튼).click();
    await (await 응답).finished();
  }

  async 제목누르기(title: string): Promise<Page> {
    const 새탭 = this.page.context().waitForEvent('page');
    await this.제목링크(title).click();
    return 새탭;
  }

  async 댓글창열기(title: string, 건수: number): Promise<void> {
    await this.줄버튼(title, `댓글 ${건수}`).click();
    await this.댓글줄들.first().waitFor();
  }

  async 공지창열기(): Promise<void> {
    if (await this.창.isVisible()) return;
    await this.공지쓰기버튼.click();
    await this.제목칸.waitFor();
    await this.창초점이잡힐때까지();
  }

  async 공지적기(제목: string, 본문: string): Promise<void> {
    await this.제목칸.fill(제목);
    await this.본문칸.fill(본문);
  }

  async 등록누르고안내기다리기(): Promise<void> {
    await this.등록.click();
    await this.안내.filter({ hasText: /\S/ }).waitFor();
  }

  async 등록누르고응답기다리기(): Promise<void> {
    const 응답 = this.page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/ops/notices');
    await this.등록.click();
    await (await 응답).finished();
  }

  async 등록빠르게두번누르기(): Promise<number> {
    const 응답들: Promise<Response | null>[] = [];
    const 듣기 = (요청: { method(): string; url(): string; response(): Promise<Response | null> }): void => {
      if (요청.method() === 'POST' && new URL(요청.url()).pathname === '/api/ops/notices') 응답들.push(요청.response());
    };
    this.page.on('request', 듣기);
    try {
      await this.등록.dblclick();
      await this.창.waitFor({ state: 'hidden' });
      await Promise.all(응답들);
    } finally {
      this.page.off('request', 듣기);
    }
    return 응답들.length;
  }

  async 창닫기누르기(): Promise<void> {
    await this.창닫기.click();
    await this.창.waitFor({ state: 'hidden' });
  }

  private async 창초점이잡힐때까지(): Promise<void> {
    await this.page.waitForFunction(() => document.activeElement?.closest('[role="dialog"]') != null);
  }

  private async 그려질때까지(응답: Promise<Response>): Promise<void> {
    await (await 응답).finished();
    await this.page.evaluate(() => new Promise<void>((끝) => requestAnimationFrame(() => requestAnimationFrame(() => 끝()))));
  }
}
