import type { Locator, Page } from '@playwright/test';

export class 모달 {
  constructor(private readonly page: Page) {}

  대화상자(이름: string): Locator {
    return this.page.getByRole('dialog', { name: 이름 });
  }

  get 전체(): Locator {
    return this.page.getByRole('dialog');
  }

  머리닫기(이름: string): Locator {
    return this.대화상자(이름).locator('.modal-x');
  }

  바닥버튼(이름: string, 버튼: string): Locator {
    return this.대화상자(이름).locator('.modal-foot').getByRole('button', { name: 버튼, exact: true });
  }

  get 바깥(): Locator {
    return this.page.locator('.modal-backdrop');
  }
}
