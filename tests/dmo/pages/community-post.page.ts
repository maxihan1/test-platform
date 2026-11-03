import type { Locator, Page } from '@playwright/test';

export class 커뮤니티글화면 {
  static readonly 주소 = '/board/<번호>';
  readonly 제목: Locator;
  readonly 작성자: Locator;
  readonly 숨김안내: Locator;
  readonly 댓글구역: Locator;
  readonly 댓글수: Locator;
  readonly 숨긴댓글줄: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('heading', { level: 1 });
    this.작성자 = page.getByText(/^작성자 /);
    this.숨김안내 = page.getByText('운영 정책에 따라 숨겨진 게시글입니다', { exact: true });
    this.댓글구역 = page.getByRole('region', { name: '댓글' });
    this.댓글수 = this.댓글구역.getByRole('heading', { name: /^댓글 \d+$/ });
    this.숨긴댓글줄 = this.댓글구역.getByRole('listitem').filter({ hasText: '운영 정책에 따라 숨겨진 댓글입니다' });
  }

  async 열기(글번호: number): Promise<void> {
    await this.page.goto(`/board/${글번호}`);
    await this.제목.or(this.숨김안내).waitFor();
  }

  async 댓글그려질때까지(): Promise<void> {
    await this.댓글수.waitFor();
  }

  async 댓글수읽기(): Promise<number> {
    return Number((await this.댓글수.innerText()).replace(/\D/g, ''));
  }

  async 쓴이읽기(): Promise<string> {
    return (await this.작성자.innerText()).replace(/^작성자\s*/, '').trim();
  }

  댓글줄(내용: string): Locator {
    return this.댓글구역.getByRole('listitem').filter({ hasText: 내용 });
  }
}
