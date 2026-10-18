import type { Dialog, Locator, Page, Response } from '@playwright/test';
import { 머리글 } from '../components/header.component.js';

export class 글쓰기화면 {
  static readonly 주소 = '/board/write';
  readonly 글쓰기제목: Locator;
  readonly 수정제목: Locator;
  readonly 분류: Locator;
  readonly 분류옵션들: Locator;
  readonly 선택된분류: Locator;
  readonly 제목칸: Locator;
  readonly 본문칸: Locator;
  readonly 제목글자수: Locator;
  readonly 본문글자수: Locator;
  readonly 이미지입력: Locator;
  readonly 미리보기들: Locator;
  readonly 이미지빼기: Locator;
  readonly 임시저장: Locator;
  readonly 취소: Locator;
  readonly 등록: Locator;
  readonly 폼로딩중: Locator;
  readonly 머리글: 머리글;

  constructor(readonly page: Page) {
    const 본문 = page.locator('main');
    this.글쓰기제목 = page.getByRole('heading', { name: '글쓰기', level: 1 });
    this.수정제목 = page.getByRole('heading', { name: '게시글 수정', level: 1 });
    this.분류 = 본문.getByRole('combobox', { name: '분류' });
    this.분류옵션들 = this.분류.getByRole('option');
    this.선택된분류 = this.분류.getByRole('option', { selected: true });
    this.제목칸 = 본문.getByRole('textbox', { name: '제목' });
    this.본문칸 = 본문.getByRole('textbox', { name: '본문' });
    this.제목글자수 = 본문.getByText(/^\d+\/50$/);
    this.본문글자수 = 본문.getByText(/^\d+\/2000$/);
    this.이미지입력 = 본문.getByLabel('이미지 첨부');
    this.미리보기들 = 본문.getByRole('img', { name: /^첨부 이미지 \d+$/ });
    this.이미지빼기 = 본문.getByRole('button', { name: '이미지 빼기' });
    this.임시저장 = 본문.getByRole('button', { name: '임시 저장', exact: true });
    this.취소 = 본문.getByRole('link', { name: '취소', exact: true });
    this.등록 = 본문.getByRole('button', { name: '등록', exact: true });
    this.폼로딩중 = page.locator('#post-form[aria-busy="true"]');
    this.머리글 = new 머리글(page);
  }

  async 열기(): Promise<void> {
    await this.page.goto(글쓰기화면.주소);
    await this.그려질때까지();
  }

  async 수정화면열기(글번호: number): Promise<void> {
    await this.page.goto(`/board/${글번호}/edit`);
    await this.그려질때까지();
  }

  async 그려질때까지(): Promise<void> {
    await this.머리글.그려질때까지();
    await this.분류.waitFor();
    await this.폼로딩중.waitFor({ state: 'hidden' });
  }

  async 확인창을처리하며열기(처리: 'accept' | 'dismiss'): Promise<string | null> {
    let 글: string | null = null;
    const 처리기 = async (창: Dialog): Promise<void> => {
      if (창.type() === 'beforeunload') {
        await 창.accept();
        return;
      }
      글 = 창.message();
      if (처리 === 'accept') await 창.accept();
      else await 창.dismiss();
    };
    this.page.on('dialog', 처리기);
    try {
      await this.열기();
    } finally {
      this.page.off('dialog', 처리기);
    }
    return 글;
  }

  async 떠나보기(): Promise<string> {
    const 받음 = this.page.waitForEvent('dialog');
    const 클릭 = this.머리글.로고.click({ noWaitAfter: true });
    const 창 = await 받음;
    const 종류 = 창.type();
    await 창.dismiss();
    await 클릭;
    return 종류;
  }

  async 등록하고응답받기(): Promise<Response> {
    const 응답 = this.page.waitForResponse((r) => new URL(r.url()).pathname === '/api/posts' && r.request().method() === 'POST');
    await this.등록.click();
    return 응답;
  }

  async 미리보기가입력칸아래인가(): Promise<boolean> {
    const 입력상자 = await this.이미지입력.boundingBox();
    const 미리보기상자 = await this.미리보기들.first().boundingBox();
    return 입력상자 !== null && 미리보기상자 !== null && 미리보기상자.y >= 입력상자.y + 입력상자.height;
  }

  async 분류고르기(이름: string): Promise<void> {
    await this.분류.selectOption({ label: 이름 });
  }

  async 채우기(글: { 분류?: string; 제목?: string; 본문?: string }): Promise<void> {
    if (글.분류 !== undefined) await this.분류고르기(글.분류);
    if (글.제목 !== undefined) await this.제목칸.fill(글.제목);
    if (글.본문 !== undefined) await this.본문칸.fill(글.본문);
  }

  async 이미지붙이기(파일들: { name: string; mimeType: string; buffer: Buffer }[]): Promise<void> {
    await this.이미지입력.setInputFiles(파일들);
  }

  async 임시저장본제목읽기(): Promise<string | null> {
    return this.page.evaluate(() => {
      const 저장값 = localStorage.getItem('dm_draft');
      return 저장값 === null ? null : (JSON.parse(저장값) as { title: string }).title;
    });
  }
}
