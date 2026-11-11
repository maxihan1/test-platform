import type { Locator, Page } from '@playwright/test';

export class 경고프리셋편집화면 {
  static readonly 주소 = '/admin/warning_presets/';

  readonly 제목: Locator;

  constructor(page: Page) {
    this.제목 = page.getByRole('heading', { name: '경고 프리셋 편집', level: 1 });
  }
}
