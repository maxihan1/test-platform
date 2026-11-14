import type { Locator, Page } from '@playwright/test';

import { 설정틀 } from '../components/settings-shell.component.js';

export class 모양설정화면 {
  static readonly 주소 = '/settings/preferences/appearance';

  readonly 틀: 설정틀;
  readonly 빠른부스트: Locator;

  constructor(private readonly page: Page) {
    this.틀 = new 설정틀(page);
    this.빠른부스트 = page.getByRole('checkbox', { name: /빠른 부스트 활성화/ });
  }

  async 열기(): Promise<void> {
    await this.page.goto(모양설정화면.주소);
    await this.틀.저장.waitFor();
  }

  async 빠른부스트바꾸고저장(켤지: boolean): Promise<void> {
    await this.빠른부스트.setChecked(켤지);
    await this.틀.저장.click();
    await this.틀.성공안내.waitFor();
  }
}
