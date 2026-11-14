import type { Locator, Page } from '@playwright/test';

import { 설정틀 } from '../components/settings-shell.component.js';

export class 기타환경설정화면 {
  static readonly 주소 = '/settings/preferences/other';

  readonly 틀: 설정틀;
  readonly 부스트그룹화: Locator;
  readonly 저장안내: Locator;

  constructor(private readonly page: Page) {
    this.틀 = new 설정틀(page);
    this.부스트그룹화 = page.getByRole('checkbox', { name: /타임라인의 부스트를 그룹화/ });
    this.저장안내 = page.getByText('정상적으로 변경되었습니다!');
  }

  async 열기(): Promise<void> {
    await this.page.goto(기타환경설정화면.주소);
    await this.틀.저장.waitFor();
    await this.부스트그룹화.waitFor();
  }

  async 저장하기(): Promise<void> {
    await this.틀.저장.click();
  }
}
