import type { Locator, Page } from '@playwright/test';

export class 게시물상세화면 {
  static readonly 주소 = '/admin/accounts/';

  readonly 제목: Locator;
  readonly 버전이력: Locator;
  readonly 메타데이터: Locator;
  readonly 공개설정: Locator;
  readonly 게시물열기: Locator;
  readonly 공개시점으로보기: Locator;
  readonly 내용: Locator;
  readonly 메타데이터항목들: Locator;

  constructor(page: Page) {
    this.제목 = page.getByRole('heading', { name: /님의 게시물/, level: 1 });
    this.버전이력 = page.getByRole('heading', { name: '버전 이력' });
    this.메타데이터 = page.getByRole('heading', { name: '메타데이터' });
    this.공개설정 = page.getByRole('rowheader', { name: '공개 설정', exact: true });
    this.게시물열기 = page.getByRole('link', { name: '게시물 열기' });
    this.공개시점으로보기 = page.getByRole('link', { name: '공개시점으로 보기' });
    this.내용 = page.getByRole('heading', { name: '내용', level: 3, exact: true });
    this.메타데이터항목들 = page.getByRole('rowheader').filter({ hasText: /^(공개 설정|좋아요|리블로그|인용)$/ });
  }

  async 그려질때까지(): Promise<void> {
    await this.제목.waitFor();
  }

  async 메타데이터항목글(): Promise<string> {
    return (await this.메타데이터항목들.allInnerTexts()).map((글) => 글.trim()).sort().join(', ');
  }
}
