import type { Locator, Page } from '@playwright/test';

export class 가입완료화면 {
  constructor(private readonly page: Page) {}

  환영문구(): Locator {
    return this.page.getByRole('heading', { level: 1 });
  }

  이름환영문구(): Locator {
    return this.환영문구().filter({ hasText: '님, 가입을 환영합니다' });
  }

  로그인하러가기버튼(): Locator {
    return this.page.getByRole('link', { name: '로그인하러 가기', exact: true });
  }
}
