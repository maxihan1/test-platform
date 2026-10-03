import type { Locator, Page } from '@playwright/test';

export class 로그아웃확인창 {
  constructor(private readonly page: Page) {}

  창(): Locator {
    return this.page.getByRole('dialog');
  }

  문구(): Locator {
    return this.창().getByText('로그아웃 하시겠습니까?', { exact: true });
  }

  확인버튼(): Locator {
    return this.창().getByRole('button', { name: '확인', exact: true });
  }
}
