import type { Locator, Page } from '@playwright/test';

export class 게시글상세화면 {
  constructor(private readonly page: Page) {}

  async 열기(번호: number | string): Promise<void> {
    await this.page.goto(`/board/${번호}`);
  }

  제목(): Locator {
    return this.page.getByRole('main').getByRole('heading', { level: 1 });
  }

  분류표시(): Locator {
    return this.page.getByText(/^분류 /);
  }

  작성자표시(): Locator {
    return this.page.getByText(/^작성자 /);
  }

  작성일표시(): Locator {
    return this.page.getByText(/^작성일 /);
  }

  조회수표시(): Locator {
    return this.page.getByText(/^조회수 \d+$/);
  }

  본문(): Locator {
    return this.page.locator('.post-body');
  }

  좋아요버튼(): Locator {
    return this.page.getByRole('button', { name: /^좋아요/ });
  }

  좋아요수(): Locator {
    return this.좋아요버튼().locator('.like-count');
  }

  채운하트(): Locator {
    return this.좋아요버튼().getByText('♥', { exact: true });
  }

  빈하트(): Locator {
    return this.좋아요버튼().getByText('♡', { exact: true });
  }

  링크복사버튼(): Locator {
    return this.page.getByRole('button', { name: '링크 복사', exact: true });
  }

  수정링크(): Locator {
    return this.page.getByRole('link', { name: '수정', exact: true });
  }

  삭제버튼(): Locator {
    return this.page.locator('.post-actions').getByRole('button', { name: '삭제', exact: true });
  }

  목록버튼(): Locator {
    return this.page.getByRole('main').getByRole('link', { name: '목록', exact: true });
  }

  없는글문구(): Locator {
    return this.page.getByText('삭제되었거나 존재하지 않는 게시글입니다', { exact: true });
  }

  댓글영역(): Locator {
    return this.page.getByRole('region', { name: '댓글', exact: true });
  }

  댓글제목(): Locator {
    return this.댓글영역().getByRole('heading', { level: 2 });
  }

  댓글수제목(개수: number): Locator {
    return this.댓글영역().getByRole('heading', { name: `댓글 ${개수}`, exact: true });
  }

  좋아요확인문구(): Locator {
    return this.page.getByRole('dialog').getByText('로그인이 필요합니다. 로그인 화면으로 이동할까요?', { exact: true });
  }

  삭제확인문구(): Locator {
    return this.page.getByRole('dialog').getByText('게시글을 삭제하시겠습니까? 삭제한 글은 되돌릴 수 없습니다.', { exact: true });
  }

  댓글줄(): Locator {
    return this.댓글영역().locator('li.comment');
  }

  댓글찾기(내용: string): Locator {
    return this.댓글줄().filter({ hasText: 내용 });
  }

  댓글작성자(): Locator {
    return this.댓글줄().locator('.who');
  }

  댓글시각(): Locator {
    return this.댓글줄().locator('.when');
  }

  댓글내용(): Locator {
    return this.댓글줄().locator('.text');
  }

  삭제된댓글표시(): Locator {
    return this.댓글영역().getByText('삭제된 댓글입니다', { exact: true });
  }

  새댓글영역(): Locator {
    return this.댓글영역().locator('.new-comment');
  }

  새댓글입력칸(): Locator {
    return this.새댓글영역().getByLabel('댓글 입력', { exact: true });
  }

  새댓글글자수(): Locator {
    return this.새댓글영역().getByText(/^\d+\/300$/);
  }

  새댓글등록버튼(): Locator {
    return this.새댓글영역().getByRole('button', { name: '등록', exact: true });
  }

  댓글로그인링크(): Locator {
    return this.댓글영역().getByRole('link', { name: '댓글을 쓰려면 로그인하세요', exact: true });
  }

  답글버튼(댓글: Locator): Locator {
    return 댓글.getByRole('button', { name: '답글', exact: true });
  }

  댓글수정버튼(댓글: Locator): Locator {
    return 댓글.getByRole('button', { name: '수정', exact: true });
  }

  댓글삭제버튼(댓글: Locator): Locator {
    return 댓글.getByRole('button', { name: '삭제', exact: true });
  }

  답글입력칸(댓글: Locator): Locator {
    return 댓글.getByLabel('답글 입력', { exact: true });
  }

  답글등록버튼(댓글: Locator): Locator {
    return 댓글.getByRole('button', { name: '등록', exact: true });
  }

  수정중인댓글(): Locator {
    return this.댓글줄().filter({ has: this.page.getByLabel('댓글 수정', { exact: true }) });
  }

  수정입력칸(댓글: Locator): Locator {
    return 댓글.getByLabel('댓글 수정', { exact: true });
  }

  저장버튼(댓글: Locator): Locator {
    return 댓글.getByRole('button', { name: '저장', exact: true });
  }

  수정취소버튼(댓글: Locator): Locator {
    return 댓글.getByRole('button', { name: '취소', exact: true });
  }

  댓글의수정됨표시(댓글: Locator): Locator {
    return 댓글.getByText('(수정됨)', { exact: true });
  }

  눌린좋아요버튼(): Locator {
    return this.page.getByRole('button', { name: /^좋아요/, pressed: true });
  }

  눌리지않은좋아요버튼(): Locator {
    return this.page.getByRole('button', { name: /^좋아요/, pressed: false });
  }

  async 클립보드읽기(): Promise<string> {
    return this.page.evaluate(() => navigator.clipboard.readText());
  }

  async 클립보드채워질때까지기다리기(): Promise<void> {
    await this.page.waitForFunction(async () => (await navigator.clipboard.readText()) !== '');
  }

  async 새댓글직접치기(글: string): Promise<void> {
    await this.새댓글입력칸().pressSequentially(글);
  }

  async 좋아요누르기(): Promise<void> {
    await this.좋아요버튼().click();
  }

  async 댓글쓰기(내용: string): Promise<void> {
    await this.새댓글입력칸().fill(내용);
    await this.새댓글등록버튼().click();
  }
}
