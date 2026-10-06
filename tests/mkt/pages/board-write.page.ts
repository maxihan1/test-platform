import type { Dialog, Locator, Page } from '@playwright/test';

import { 토스트 } from '../components/feedback.component.js';
import type { 올릴파일 } from '../components/files.component.js';

export interface 열린확인창 {
  종류: string;
  문구: string;
}

export class 글쓰기화면 {
  readonly 토스트: 토스트;
  readonly 제목글: Locator;
  readonly 수정제목글: Locator;
  readonly 분류: Locator;
  readonly 제목: Locator;
  readonly 본문: Locator;
  readonly 제목글자수: Locator;
  readonly 본문글자수: Locator;
  readonly 이미지칸: Locator;
  readonly 미리보기: Locator;
  readonly 이미지빼기버튼: Locator;
  readonly 임시저장버튼: Locator;
  readonly 취소링크: Locator;
  readonly 등록버튼: Locator;
  readonly 열린확인창들: 열린확인창[] = [];

  constructor(private readonly page: Page) {
    this.토스트 = new 토스트(page);
    this.제목글 = page.getByRole('heading', { name: '글쓰기', level: 1 });
    this.수정제목글 = page.getByRole('heading', { name: '게시글 수정', level: 1 });
    this.분류 = page.getByRole('combobox', { name: /^분류/ });
    this.제목 = page.getByRole('textbox', { name: /^제목/ });
    this.본문 = page.getByRole('textbox', { name: /^본문/ });
    this.제목글자수 = page.getByText(/^\d+\/50$/);
    this.본문글자수 = page.getByText(/^\d+\/2000$/);
    this.이미지칸 = page.getByLabel(/^이미지 첨부/);
    this.미리보기 = page.getByRole('img', { name: /^첨부 이미지 \d+$/ });
    this.이미지빼기버튼 = page.getByRole('button', { name: '이미지 빼기', exact: true });
    this.임시저장버튼 = page.getByRole('button', { name: '임시 저장', exact: true });
    this.취소링크 = page.getByRole('link', { name: '취소', exact: true });
    this.등록버튼 = page.getByRole('button', { name: '등록', exact: true });
  }

  async 확인창받기(동작: 'accept' | 'dismiss'): Promise<void> {
    this.page.on('dialog', async (창: Dialog) => {
      this.열린확인창들.push({ 종류: 창.type(), 문구: 창.message() });
      if (동작 === 'accept') await 창.accept();
      else await 창.dismiss();
    });
  }

  async 열기(): Promise<void> {
    await this.page.goto('/board/write');
    await this.제목글.waitFor();
    await this.page.locator('#post-form:not([aria-busy])').waitFor();
  }

  async 열고확인창기다리기(): Promise<Dialog> {
    const 확인창 = new Promise<Dialog>((끝) => {
      const 받기 = async (창: Dialog): Promise<void> => {
        if (창.type() === 'beforeunload') {
          await 창.accept();
          return;
        }
        this.page.off('dialog', 받기);
        끝(창);
      };
      this.page.on('dialog', 받기);
    });
    await this.page.goto('/board/write');
    return 확인창;
  }

  async 확인창누르고폼기다리기(창: Dialog): Promise<void> {
    await 창.accept();
    await this.page.locator('#post-form:not([aria-busy])').waitFor();
  }

  async 수정열림기다리기(): Promise<void> {
    await this.수정제목글.waitFor();
    await this.page.locator('#post-form:not([aria-busy])').waitFor();
  }

  async 미리보기기다리기(개수: number): Promise<void> {
    await this.미리보기.nth(개수 - 1).waitFor();
  }

  async 미리보기가입력칸아래인가(): Promise<boolean> {
    const 그림 = await this.미리보기.first().boundingBox();
    const 입력칸 = await this.본문.boundingBox();
    if (!그림 || !입력칸) return false;
    return 그림.y >= 입력칸.y + 입력칸.height;
  }

  async 채우기(내용: { 분류?: string; 제목?: string; 본문?: string }): Promise<void> {
    if (내용.분류 !== undefined) await this.분류.selectOption({ label: 내용.분류 });
    if (내용.제목 !== undefined) await this.제목.fill(내용.제목);
    if (내용.본문 !== undefined) await this.본문.fill(내용.본문);
  }

  async 등록하기(): Promise<void> {
    await this.등록버튼.click();
  }

  async 이미지올리기(...파일들: 올릴파일[]): Promise<void> {
    await this.이미지칸.setInputFiles(파일들);
  }

  async 분류글자들읽기(): Promise<string[]> {
    return this.분류.getByRole('option').allInnerTexts();
  }

  async 제목읽기(): Promise<string> {
    return this.제목.inputValue();
  }

  async 본문읽기(): Promise<string> {
    return this.본문.inputValue();
  }

  async 경로읽기(): Promise<string> {
    return new URL(this.page.url()).pathname;
  }
}
