import type { Locator, Page } from '@playwright/test';

export class 프로필편집사용자명칸 {
  readonly 사용자명칸: Locator;

  constructor(page: Page) {
    this.사용자명칸 = page.getByRole('textbox', { name: /사용자명|사용자 이름|아이디/ });
  }
}
