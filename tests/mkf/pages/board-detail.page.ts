import type { Locator, Page } from '@playwright/test';

export class 게시글상세화면 {
  static readonly 주소 = '/board/:id';

  readonly 제목: Locator;
  readonly 글정보: Locator;
  readonly 본문: Locator;
  readonly 첨부이미지: Locator;
  readonly 좋아요: Locator;
  readonly 눌린좋아요: Locator;
  readonly 링크복사: Locator;
  readonly 글동작: Locator;
  readonly 수정: Locator;
  readonly 삭제: Locator;
  readonly 목록: Locator;
  readonly 없는글안내: Locator;
  readonly 댓글영역: Locator;
  readonly 댓글제목: Locator;
  readonly 댓글항목들: Locator;
  readonly 새댓글칸: Locator;
  readonly 새댓글입력: Locator;
  readonly 새댓글글자수: Locator;
  readonly 새댓글등록: Locator;
  readonly 로그인안내링크: Locator;

  constructor(readonly page: Page) {
    const 글 = page.getByRole('article');
    this.제목 = 글.getByRole('heading', { level: 1 });
    this.글정보 = 글.locator('.post-meta');
    this.본문 = 글.locator('.post-body');
    this.첨부이미지 = 글.getByRole('img', { name: /^첨부 이미지/ });
    this.좋아요 = 글.getByRole('button', { name: /^좋아요/ });
    this.눌린좋아요 = 글.getByRole('button', { name: /^좋아요/, pressed: true });
    this.링크복사 = 글.getByRole('button', { name: '링크 복사', exact: true });
    this.글동작 = 글.locator('.post-actions');
    this.수정 = this.글동작.getByRole('link', { name: '수정', exact: true });
    this.삭제 = this.글동작.getByRole('button', { name: '삭제', exact: true });
    this.목록 = 글.getByRole('link', { name: '목록', exact: true });
    this.없는글안내 = page.getByText('삭제되었거나 존재하지 않는 게시글입니다', { exact: true });
    this.댓글영역 = page.getByRole('region', { name: '댓글' });
    this.댓글제목 = this.댓글영역.getByRole('heading', { name: /^댓글 \d+$/ });
    this.댓글항목들 = this.댓글영역.getByRole('list').getByRole('listitem');
    this.새댓글칸 = this.댓글영역.locator('.new-comment');
    this.새댓글입력 = this.새댓글칸.getByLabel('댓글 입력', { exact: true });
    this.새댓글글자수 = this.새댓글칸.getByText(/^\d+\/300$/);
    this.새댓글등록 = this.새댓글칸.getByRole('button', { name: '등록', exact: true });
    this.로그인안내링크 = this.새댓글칸.getByRole('link', { name: '댓글을 쓰려면 로그인하세요', exact: true });
  }

  async 열기(글번호: number | string): Promise<void> {
    await this.page.goto(`/board/${String(글번호)}`);
  }

  async 그려질때까지(): Promise<void> {
    await this.제목.or(this.없는글안내).first().waitFor();
  }

  async 댓글까지그려질때까지(): Promise<void> {
    await this.댓글제목.waitFor();
  }

  async 조회수(): Promise<number> {
    const 글 = await this.글정보.innerText();
    return Number(/조회수\s*(\d+)/.exec(글)?.[1] ?? Number.NaN);
  }

  async 좋아요수(): Promise<number> {
    const 글 = await this.좋아요.innerText();
    return Number(/(\d+)\s*$/.exec(글)?.[1] ?? Number.NaN);
  }

  댓글(내용: string): Locator {
    return this.댓글항목들.filter({ hasText: 내용 });
  }

  댓글답글버튼(내용: string): Locator {
    return this.댓글(내용).getByRole('button', { name: '답글', exact: true });
  }

  댓글수정버튼(내용: string): Locator {
    return this.댓글(내용).getByRole('button', { name: '수정', exact: true });
  }

  댓글삭제버튼(내용: string): Locator {
    return this.댓글(내용).getByRole('button', { name: '삭제', exact: true });
  }

  답글입력(내용: string): Locator {
    return this.댓글(내용).getByLabel('답글 입력', { exact: true });
  }

  댓글수정입력(내용: string): Locator {
    return this.댓글(내용).getByLabel('댓글 수정', { exact: true });
  }

  댓글칸버튼(내용: string, 이름: '저장' | '취소' | '등록'): Locator {
    return this.댓글(내용).getByRole('button', { name: 이름, exact: true });
  }

  async 댓글달기(내용: string): Promise<void> {
    await this.새댓글입력.fill(내용);
    await this.새댓글등록.click();
  }

  async 댓글내용들(): Promise<string[]> {
    return await this.댓글항목들.getByRole('paragraph').allInnerTexts();
  }
}
