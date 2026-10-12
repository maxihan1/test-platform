import type { Locator, Page } from '@playwright/test';

export class 게시글상세화면 {
  static readonly 주소 = '/board/9';

  readonly 제목: Locator;
  readonly 좋아요: Locator;
  readonly 링크복사: Locator;
  readonly 목록링크: Locator;
  readonly 없는글안내: Locator;
  readonly 댓글영역: Locator;
  readonly 댓글제목: Locator;
  readonly 새댓글입력: Locator;
  readonly 새댓글글자수: Locator;

  constructor(readonly page: Page) {
    const 글 = page.getByRole('article');
    this.제목 = 글.getByRole('heading', { level: 1 });
    this.좋아요 = 글.getByRole('button', { name: /^좋아요/ });
    this.링크복사 = 글.getByRole('button', { name: '링크 복사', exact: true });
    this.목록링크 = page.getByRole('link', { name: '목록', exact: true });
    this.없는글안내 = page.getByText('삭제되었거나 존재하지 않는 게시글입니다', { exact: true });
    this.댓글영역 = page.getByRole('region', { name: '댓글' });
    this.댓글제목 = this.댓글영역.getByRole('heading', { name: /^댓글 \d+$/ });
    this.새댓글입력 = this.댓글영역.getByLabel('댓글 입력', { exact: true });
    this.새댓글글자수 = this.댓글영역.getByText(/^\d+\/300$/);
  }

  async 열기(글번호?: number | string): Promise<void> {
    await this.page.goto(글번호 === undefined ? 게시글상세화면.주소 : `/board/${String(글번호)}`);
  }

  async 댓글까지그려질때까지(): Promise<void> {
    await this.댓글제목.waitFor();
  }
}
