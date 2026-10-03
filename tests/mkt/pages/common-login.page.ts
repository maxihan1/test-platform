import type { Locator, Page } from '@playwright/test';

export class 로그인화면보충 {
  constructor(private readonly page: Page) {}

  로그인제목(): Locator {
    return this.page.getByRole('heading', { name: '로그인', level: 1, exact: true });
  }

  처리중버튼(): Locator {
    return this.page.getByRole('button', { name: '처리 중', exact: true });
  }

  로딩표시(): Locator {
    return this.page.getByLabel('처리 중', { exact: true });
  }
}
