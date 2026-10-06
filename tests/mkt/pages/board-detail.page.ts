import type { Locator, Page } from '@playwright/test';

import { 토스트 } from '../components/feedback.component.js';

export class 게시글상세화면 {
  readonly 토스트: 토스트;
  readonly 제목: Locator;
  readonly 분류: Locator;
  readonly 작성자: Locator;
  readonly 작성일: Locator;
  readonly 조회수: Locator;
  readonly 첨부이미지: Locator;
  readonly 좋아요버튼: Locator;
  readonly 채운하트: Locator;
  readonly 링크복사버튼: Locator;
  readonly 수정링크: Locator;
  readonly 삭제버튼: Locator;
  readonly 목록버튼: Locator;
  readonly 없는글문구: Locator;
  readonly 댓글구역: Locator;
  readonly 댓글항목들: Locator;
  readonly 댓글입력칸: Locator;
  readonly 댓글글자수: Locator;
  readonly 댓글등록버튼: Locator;
  readonly 로그인유도링크: Locator;
  readonly 삭제된댓글표시: Locator;

  constructor(private readonly page: Page) {
    this.토스트 = new 토스트(page);
    this.제목 = page.getByRole('heading', { level: 1 });
    this.분류 = page.getByText(/^분류 \S/);
    this.작성자 = page.getByText(/^작성자 \S/);
    this.작성일 = page.getByText(/^작성일 \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    this.조회수 = page.getByText(/^조회수 \d+$/);
    this.첨부이미지 = page.getByRole('img', { name: /^첨부 이미지 \d+$/ });
    this.좋아요버튼 = page.getByRole('button', { name: /^좋아요 \d+$/ });
    this.채운하트 = this.좋아요버튼.getByText('♥');
    this.링크복사버튼 = page.getByRole('button', { name: '링크 복사', exact: true });
    this.수정링크 = page.getByRole('link', { name: '수정', exact: true });
    this.삭제버튼 = page.locator('.post-actions').getByRole('button', { name: '삭제', exact: true });
    this.목록버튼 = page.getByRole('link', { name: '목록', exact: true });
    this.없는글문구 = page.getByText('삭제되었거나 존재하지 않는 게시글입니다', { exact: true });
    this.댓글구역 = page.getByRole('region', { name: '댓글' });
    this.댓글항목들 = this.댓글구역.getByRole('listitem');
    this.댓글입력칸 = this.댓글구역.getByRole('textbox', { name: '댓글 입력', exact: true });
    this.댓글글자수 = this.댓글구역.getByText(/^\d+\/300$/);
    this.댓글등록버튼 = this.댓글구역.locator('.new-comment').getByRole('button', { name: '등록', exact: true });
    this.삭제된댓글표시 = this.댓글구역.getByText('삭제된 댓글입니다', { exact: true });
    this.로그인유도링크 = this.댓글구역.getByRole('link', { name: '댓글을 쓰려면 로그인하세요', exact: true });
  }

  async 열기(글번호: number): Promise<void> {
    await this.page.goto(`/board/${글번호}`);
    await this.제목.waitFor();
  }

  async 제목기다리기(글제목: string): Promise<void> {
    await this.page.getByRole('heading', { level: 1, name: 글제목, exact: true }).waitFor();
  }

  async 새로고침하고기다리기(): Promise<void> {
    await this.page.reload();
    await this.제목.waitFor();
    await this.댓글구역.getByRole('heading', { name: /^댓글( \d+)?$/ }).waitFor();
  }

  async 댓글영역기다리기(): Promise<void> {
    await this.댓글구역.getByRole('heading', { name: /^댓글 \d+$/ }).waitFor();
  }

  댓글제목(개수: number): Locator {
    return this.댓글구역.getByRole('heading', { name: `댓글 ${개수}`, exact: true });
  }

  댓글(내용: string): Locator {
    return this.댓글항목들.filter({ hasText: 내용 });
  }

  본문(글: string): Locator {
    return this.page.getByText(글, { exact: true });
  }

  async 조회수읽기(): Promise<number> {
    const 글 = await this.조회수.innerText();
    return Number(글.replace(/\D/g, ''));
  }

  async 댓글글자수가입력칸오른쪽아래인가(): Promise<boolean> {
    const 글자수 = await this.댓글글자수.boundingBox();
    const 입력칸 = await this.댓글입력칸.boundingBox();
    if (!글자수 || !입력칸) return false;
    const 오른쪽 = 글자수.x + 글자수.width / 2 > 입력칸.x + 입력칸.width / 2;
    const 아래 = 글자수.y >= 입력칸.y + 입력칸.height - 1;
    return 오른쪽 && 아래;
  }

  async 좋아요수읽기(): Promise<number> {
    const 글 = await this.좋아요버튼.innerText();
    return Number(/좋아요\s*(\d+)/.exec(글)?.[1] ?? Number.NaN);
  }

  async 좋아요누르고기다리기(눌림: boolean): Promise<void> {
    await this.좋아요버튼.click();
    await this.page.getByRole('button', { name: /^좋아요 \d+$/, pressed: 눌림 }).waitFor();
  }

  async 없는글열기(글번호: number): Promise<void> {
    await this.page.goto(`/board/${글번호}`);
    await this.없는글문구.waitFor();
  }

  async 경로읽기(): Promise<string> {
    return new URL(this.page.url()).pathname;
  }

  async 클립보드읽기(): Promise<string> {
    return this.page.evaluate(() => navigator.clipboard.readText());
  }

  async 댓글쓰고등록하기(내용: string): Promise<void> {
    await this.댓글입력칸.fill(내용);
    await this.댓글등록버튼.click();
  }

  async 댓글순서읽기(): Promise<string[]> {
    return this.댓글항목들.getByRole('paragraph').allInnerTexts();
  }

  답글버튼(내용: string): Locator {
    return this.댓글(내용).getByRole('button', { name: '답글', exact: true });
  }

  댓글수정버튼(내용: string): Locator {
    return this.댓글(내용).getByRole('button', { name: '수정', exact: true });
  }

  댓글삭제버튼(내용: string): Locator {
    return this.댓글(내용).getByRole('button', { name: '삭제', exact: true });
  }

  답글입력칸(내용: string): Locator {
    return this.댓글(내용).getByRole('textbox', { name: '답글 입력', exact: true });
  }

  답글등록버튼(내용: string): Locator {
    return this.댓글(내용).getByRole('button', { name: '등록', exact: true });
  }

  수정입력칸(내용: string): Locator {
    return this.댓글(내용).getByRole('textbox', { name: '댓글 수정', exact: true });
  }

  수정저장버튼(내용: string): Locator {
    return this.댓글(내용).getByRole('button', { name: '저장', exact: true });
  }

  수정취소버튼(내용: string): Locator {
    return this.댓글(내용).getByRole('button', { name: '취소', exact: true });
  }

  수정됨표시(내용: string): Locator {
    return this.댓글(내용).getByText('(수정됨)', { exact: true });
  }

  async 답글입력칸이댓글아래인가(내용: string): Promise<boolean> {
    const 댓글글 = await this.댓글(내용).getByRole('paragraph').boundingBox();
    const 입력칸 = await this.답글입력칸(내용).boundingBox();
    if (!댓글글 || !입력칸) return false;
    return 입력칸.y >= 댓글글.y + 댓글글.height;
  }

  댓글작성자(내용: string, 이름: string): Locator {
    return this.댓글(내용).getByText(이름, { exact: true });
  }

  댓글시각(내용: string): Locator {
    return this.댓글(내용).getByText(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  }
}
