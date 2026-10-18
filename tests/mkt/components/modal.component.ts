import type { Locator, Page } from '@playwright/test';

export class 모달 {
  readonly 창: Locator;

  constructor(readonly page: Page) {
    this.창 = page.getByRole('dialog');
  }

  제목이(제목: string): Locator {
    return this.page.getByRole('dialog', { name: 제목 });
  }

  글이든(글: string): Locator {
    return this.창.filter({ hasText: 글 });
  }

  버튼(창: Locator, 이름: string): Locator {
    return 창.getByRole('button', { name: 이름, exact: true });
  }

  닫기X(창: Locator): Locator {
    return 창.getByRole('button', { name: '닫기', exact: true }).first();
  }

  async 뜰때까지(창: Locator): Promise<void> {
    await 창.waitFor();
  }

  async 닫힐때까지(창: Locator): Promise<void> {
    await 창.waitFor({ state: 'hidden' });
  }
}
