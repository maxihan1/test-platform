import type { Locator, Page } from '@playwright/test';

export class 로그인안내창 {
  readonly 창: Locator;
  readonly 제목: Locator;
  readonly 서버칸: Locator;
  readonly 이동: Locator;
  readonly 계정생성: Locator;

  constructor(page: Page) {
    this.창 = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: '로그인해서 계속하기' }) });
    this.제목 = this.창.getByRole('heading', { name: '로그인해서 계속하기' });
    this.서버칸 = this.창.getByRole('textbox');
    this.이동 = this.창.getByRole('button', { name: '이동' });
    this.계정생성 = this.창.getByRole('link', { name: '계정 생성' });
  }

  글(문구: string | RegExp): Locator {
    return this.창.getByText(문구);
  }
}
