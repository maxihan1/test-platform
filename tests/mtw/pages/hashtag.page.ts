import type { Locator, Page } from '@playwright/test';

import { 로그인안내창 } from '../components/interaction-modal.component.js';

export class 해시태그화면 {
  static readonly 주소 = '/tags/{태그}';

  readonly 안내창: 로그인안내창;
  readonly 글목록: Locator;
  readonly 첫글: Locator;
  readonly 팔로우버튼: Locator;
  readonly 빈안내: Locator;

  constructor(private readonly page: Page) {
    this.안내창 = new 로그인안내창(page);
    this.글목록 = page.getByRole('main').getByRole('feed').getByRole('article');
    this.첫글 = this.글목록.first();
    this.팔로우버튼 = page.getByRole('main').getByRole('button', { name: '해시태그 팔로우' });
    this.빈안내 = page.getByText('이 해시태그는 아직 사용되지 않았습니다.');
  }

  제목(태그: string): Locator {
    return this.page.getByRole('main').getByRole('heading', { name: `#${태그}`, level: 1 });
  }

  태그글(태그: string): Locator {
    return this.글목록.filter({ hasText: `#${태그}` });
  }

  async 열기(태그: string): Promise<void> {
    await this.page.goto(`/tags/${encodeURIComponent(태그)}`);
    await this.제목(태그).or(this.빈안내).or(this.첫글).first().waitFor();
  }
}
