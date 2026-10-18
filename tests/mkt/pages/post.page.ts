import type { Locator, Page } from '@playwright/test';
import { 머리글 } from '../components/header.component.js';

export class 게시글화면 {
  static readonly 주소 = '/board/{글번호}';
  readonly 글: Locator;
  readonly 제목: Locator;
  readonly 이미지들: Locator;
  readonly 글버튼묶음: Locator;
  readonly 좋아요: Locator;
  readonly 링크복사: Locator;
  readonly 수정링크: Locator;
  readonly 삭제버튼: Locator;
  readonly 목록링크: Locator;
  readonly 없는글안내: Locator;
  readonly 로딩중: Locator;
  readonly 댓글영역: Locator;
  readonly 댓글제목: Locator;
  readonly 댓글입력: Locator;
  readonly 글자수: Locator;
  readonly 등록버튼: Locator;
  readonly 로그인유도링크: Locator;
  readonly 댓글내용들: Locator;
  readonly 삭제된자리: Locator;
  readonly 머리글: 머리글;

  constructor(readonly page: Page) {
    this.글 = page.getByRole('article');
    this.제목 = this.글.getByRole('heading', { level: 1 });
    this.이미지들 = this.글.getByRole('img', { name: /^첨부 이미지 \d+$/ });
    this.글버튼묶음 = this.글.locator('.post-actions');
    this.좋아요 = this.글.getByRole('button', { name: /^좋아요/ });
    this.링크복사 = this.글.getByRole('button', { name: '링크 복사', exact: true });
    this.수정링크 = this.글.getByRole('link', { name: '수정', exact: true });
    this.삭제버튼 = this.글버튼묶음.getByRole('button', { name: '삭제', exact: true });
    this.목록링크 = this.글.getByRole('link', { name: '목록', exact: true });
    this.없는글안내 = page.getByText('삭제되었거나 존재하지 않는 게시글입니다');
    this.로딩중 = page.locator('#post[aria-busy="true"]');
    this.댓글영역 = this.글.getByRole('region', { name: '댓글' });
    this.댓글제목 = this.댓글영역.getByRole('heading', { level: 2 });
    this.댓글입력 = this.댓글영역.getByRole('textbox', { name: '댓글 입력' });
    this.글자수 = this.댓글영역.getByText(/^\d+\/300$/);
    this.등록버튼 = this.댓글영역.getByRole('button', { name: '등록', exact: true });
    this.로그인유도링크 = this.댓글영역.getByRole('link', { name: '댓글을 쓰려면 로그인하세요' });
    this.댓글내용들 = this.댓글영역.locator('p.text');
    this.삭제된자리 = this.댓글영역.getByText('삭제된 댓글입니다');
    this.머리글 = new 머리글(page);
  }

  메타(항목: string): Locator {
    return this.글.locator('.post-meta').getByText(new RegExp(`^${항목} `));
  }

  본문(내용: string): Locator {
    return this.글.getByText(내용, { exact: true });
  }

  댓글줄(내용: string): Locator {
    return this.댓글영역.getByRole('listitem').filter({ hasText: 내용 });
  }

  답글버튼(줄: Locator): Locator {
    return 줄.getByRole('button', { name: '답글', exact: true });
  }

  수정버튼(줄: Locator): Locator {
    return 줄.getByRole('button', { name: '수정', exact: true });
  }

  삭제버튼들(줄: Locator): Locator {
    return 줄.getByRole('button', { name: '삭제', exact: true });
  }

  답글입력(줄: Locator): Locator {
    return 줄.getByRole('textbox', { name: '답글 입력' });
  }

  수정입력(줄: Locator): Locator {
    return 줄.getByRole('textbox', { name: '댓글 수정' });
  }

  저장버튼(줄: Locator): Locator {
    return 줄.getByRole('button', { name: '저장', exact: true });
  }

  취소버튼(줄: Locator): Locator {
    return 줄.getByRole('button', { name: '취소', exact: true });
  }

  수정됨표시(줄: Locator): Locator {
    return 줄.getByText('(수정됨)');
  }

  async 열기(글번호: number): Promise<void> {
    await this.page.goto(`/board/${글번호}`);
    await this.머리글.그려질때까지();
    await this.로딩중.waitFor({ state: 'hidden' });
  }

  async 댓글불러올때까지(): Promise<void> {
    await this.댓글영역.getByRole('heading', { name: /^댓글 \d+$/ }).waitFor();
  }

  async 좋아요수읽기(): Promise<number> {
    return Number(((await this.좋아요.innerText()).match(/(\d+)\s*$/) ?? [])[1]);
  }

  async 댓글수읽기(): Promise<number> {
    return Number(((await this.댓글제목.innerText()).match(/(\d+)\s*$/) ?? [])[1]);
  }

  작성자표시(줄: Locator, 이름: string): Locator {
    return 줄.getByText(이름);
  }

  시각표시(줄: Locator): Locator {
    return 줄.getByText(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
  }

  async 조회수읽기(): Promise<number> {
    return Number(((await this.메타('조회수').innerText()).match(/(\d+)\s*$/) ?? [])[1]);
  }

  async 댓글수가될때까지(개수: number): Promise<void> {
    await this.댓글영역.getByRole('heading', { name: `댓글 ${개수}`, exact: true }).waitFor();
  }

  async 클립보드읽기(): Promise<string> {
    return this.page.evaluate(() => navigator.clipboard.readText());
  }

  async 비회원좋아요모달띄우기(): Promise<void> {
    await this.좋아요.click();
    await this.page.getByRole('dialog').waitFor();
  }

  async 좋아요누르기(): Promise<void> {
    await this.좋아요.click();
    await this.좋아요.waitFor();
  }

  async 댓글적기(글: string): Promise<void> {
    await this.댓글입력.fill(글);
  }

  async 댓글등록하기(글: string): Promise<void> {
    await this.댓글적기(글);
    await this.등록버튼.click();
  }
}
