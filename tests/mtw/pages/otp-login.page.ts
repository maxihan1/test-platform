import type { Locator, Page } from '@playwright/test';

export class 이단계인증코드화면 {
  readonly 코드칸: Locator;

  constructor(page: Page) {
    this.코드칸 = page.getByRole('textbox', { name: /이중 인증 코드|2단계 인증 코드|인증 코드/ });
  }
}
