import type { Locator, Page } from '@playwright/test';

export class 유행게시물화면 {
  static readonly 주소 = '/admin/trends/statuses';

  readonly 제목: Locator;
  readonly 모두: Locator;
  readonly 허용된것만: Locator;
  readonly 게시물허용: Locator;
  readonly 작성자허용: Locator;
  readonly 게시물비허용: Locator;
  readonly 작성자금지: Locator;
  readonly 대기게시물선택칸: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '유행하는 게시물', level: 1 });
    this.모두 = page.getByRole('main').getByRole('link', { name: '모두', exact: true });
    this.허용된것만 = page.getByRole('main').getByRole('link', { name: '허용된 것만', exact: true });
    this.게시물허용 = page.getByRole('button', { name: '게시물 허용', exact: true });
    this.작성자허용 = page.getByRole('button', { name: '작성자 허용', exact: true });
    this.게시물비허용 = page.getByRole('button', { name: '게시물 비허용', exact: true });
    this.작성자금지 = page.getByRole('button', { name: '작성자 금지', exact: true });
    this.대기게시물선택칸 = page.locator('.batch-table__row').filter({ hasText: '심사 대기' }).first().getByRole('checkbox');
  }

  async 열기(): Promise<void> {
    await this.page.goto(유행게시물화면.주소);
    await this.제목.waitFor();
    await this.게시물허용.waitFor();
  }
}
