import type { Locator, Page } from '@playwright/test';

export class 게시글상세화면 {
  static readonly 주소 = '/board/:n';

  readonly 제목: Locator;
  readonly 분류: Locator;
  readonly 작성자: Locator;
  readonly 작성일: Locator;
  readonly 조회수: Locator;
  readonly 본문: Locator;
  readonly 첨부이미지들: Locator;
  readonly 좋아요: Locator;
  readonly 링크복사: Locator;
  readonly 수정: Locator;
  readonly 삭제: Locator;
  readonly 목록: Locator;
  readonly 없는글안내: Locator;
  readonly 댓글영역: Locator;
  readonly 댓글제목: Locator;
  readonly 댓글줄들: Locator;
  readonly 새댓글칸: Locator;
  readonly 새댓글등록: Locator;
  readonly 새댓글글자수: Locator;
  readonly 로그인유도링크: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { level: 1 });
    this.분류 = page.getByText(/^분류 /);
    this.작성자 = page.getByText(/^작성자 /);
    this.작성일 = page.getByText(/^작성일 /);
    this.조회수 = page.getByText(/^조회수 \d+$/);
    this.본문 = page.locator('.post-body');
    this.첨부이미지들 = page.getByRole('img', { name: /^첨부 이미지 \d+$/ });
    this.좋아요 = page.getByRole('button', { name: /좋아요 \d+/ });
    this.링크복사 = page.getByRole('button', { name: '링크 복사', exact: true });
    this.수정 = page.getByRole('link', { name: '수정', exact: true });
    this.삭제 = page.locator('.post-actions').getByRole('button', { name: '삭제', exact: true });
    this.목록 = page.getByRole('link', { name: '목록', exact: true });
    this.없는글안내 = page.getByText('삭제되었거나 존재하지 않는 게시글입니다', { exact: true });
    this.댓글영역 = page.getByRole('region', { name: '댓글', exact: true });
    this.댓글제목 = this.댓글영역.getByRole('heading', { level: 2 });
    this.댓글줄들 = this.댓글영역.getByRole('listitem');
    this.새댓글칸 = this.댓글영역.getByRole('textbox', { name: '댓글 입력', exact: true });
    this.새댓글등록 = this.댓글영역.locator('.new-comment').getByRole('button', { name: '등록', exact: true });
    this.새댓글글자수 = this.댓글영역.locator('.new-comment .counter');
    this.로그인유도링크 = this.댓글영역.getByRole('link', { name: '댓글을 쓰려면 로그인하세요', exact: true });
  }

  async 열기(번호: number): Promise<void> {
    await this.page.goto(`/board/${번호}`);
    await this.그려질때까지();
  }

  async 그려질때까지(): Promise<void> {
    await this.page.waitForFunction(() => {
      const 글 = document.querySelector('#post');
      return 글 !== null && !글.hasAttribute('aria-busy') && 글.children.length > 0;
    });
  }

  async 댓글그려질때까지(): Promise<void> {
    await this.page.waitForFunction(() => {
      const 목록 = document.querySelector('.comments ul');
      return 목록 !== null && !목록.hasAttribute('aria-busy');
    });
  }

  async 조회수읽기(): Promise<number> {
    const 글 = await this.조회수.innerText();
    return Number(글.replace('조회수 ', ''));
  }

  async 좋아요수읽기(): Promise<number> {
    const 글 = await this.좋아요.innerText();
    return Number(글.replace(/\D/g, ''));
  }

  async 댓글수읽기(): Promise<number> {
    const 글 = await this.댓글제목.innerText();
    return Number(글.replace('댓글 ', ''));
  }

  async 좋아요눌림될때까지(눌림: boolean): Promise<void> {
    await this.page.getByRole('button', { name: /좋아요 \d+/, pressed: 눌림 }).waitFor();
  }

  async 댓글수가될때까지(개수: number): Promise<void> {
    await this.댓글영역.getByRole('heading', { level: 2, name: `댓글 ${개수}`, exact: true }).waitFor();
  }

  댓글줄(내용: string): Locator {
    return this.댓글줄들.filter({ hasText: 내용 });
  }

  답글버튼(줄: Locator): Locator {
    return 줄.getByRole('button', { name: '답글', exact: true });
  }

  댓글수정버튼(줄: Locator): Locator {
    return 줄.getByRole('button', { name: '수정', exact: true });
  }

  댓글삭제버튼(줄: Locator): Locator {
    return 줄.getByRole('button', { name: '삭제', exact: true });
  }

  답글칸(줄: Locator): Locator {
    return 줄.getByRole('textbox', { name: '답글 입력', exact: true });
  }

  수정칸(줄: Locator): Locator {
    return 줄.getByRole('textbox', { name: '댓글 수정', exact: true });
  }

  댓글저장버튼(줄: Locator): Locator {
    return 줄.getByRole('button', { name: '저장', exact: true });
  }

  댓글수정취소버튼(줄: Locator): Locator {
    return 줄.getByRole('button', { name: '취소', exact: true });
  }

  답글등록버튼(줄: Locator): Locator {
    return 줄.getByRole('button', { name: '등록', exact: true });
  }

  async 댓글쓰기(내용: string): Promise<void> {
    await this.새댓글칸.fill(내용);
    await this.새댓글등록.click();
  }

  async 댓글본문들(): Promise<string[]> {
    return this.댓글영역.locator('li .text').allInnerTexts();
  }
}
