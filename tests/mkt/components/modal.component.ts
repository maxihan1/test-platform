import type { Locator, Page } from '@playwright/test';

export class 모달 {
  constructor(private readonly page: Page) {}

  창(): Locator {
    return this.page.getByRole('dialog');
  }

  제목(): Locator {
    return this.창().getByRole('heading');
  }

  버튼(이름: string): Locator {
    return this.창().getByRole('button', { name: 이름, exact: true });
  }

  닫기X(): Locator {
    return this.창().getByRole('button', { name: '닫기', exact: true });
  }

  바깥영역(): Locator {
    return this.page.locator('.modal-backdrop');
  }
}
