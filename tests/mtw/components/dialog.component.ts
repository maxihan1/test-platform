import type { Locator, Page } from '@playwright/test';

export class 대화창 {
  readonly 창: Locator;

  constructor(page: Page) {
    this.창 = page.getByRole('dialog');
  }

  제목(글: string | RegExp): Locator {
    return this.창.getByRole('heading', { name: 글 });
  }

  버튼(이름: string | RegExp): Locator {
    return this.창.getByRole('button', { name: 이름 });
  }

  async 뜰때까지(): Promise<void> {
    await this.창.first().waitFor();
  }

  async 닫힐때까지(): Promise<void> {
    await this.창.first().waitFor({ state: 'detached' });
  }
}
