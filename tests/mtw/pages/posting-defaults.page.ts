import type { Locator, Page } from '@playwright/test';

import { 설정틀 } from '../components/settings-shell.component.js';

export class 게시물기본설정화면 {
  static readonly 주소 = '/settings/preferences/posting_defaults';

  readonly 틀: 설정틀;
  readonly 공개범위: Locator;
  readonly 인용허용: Locator;

  constructor(private readonly page: Page) {
    this.틀 = new 설정틀(page);
    this.공개범위 = page.getByRole('combobox', { name: '게시물 공개 범위' });
    this.인용허용 = page.getByRole('combobox', { name: '인용할 수 있는 사람' });
  }

  async 열기(): Promise<void> {
    await this.page.goto(게시물기본설정화면.주소);
    await this.틀.저장.waitFor();
    await this.공개범위.waitFor();
  }

  async 선택된글(칸: Locator): Promise<string> {
    return 칸.evaluate((요소) => ((요소 as HTMLSelectElement).selectedOptions[0]?.textContent ?? '').trim());
  }
}
