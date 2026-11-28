import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지 } from '@platform/kit/parts';

import { 확인창 } from '../components/dialog.component.js';
import { 앱id } from '../helpers/app.helper.js';
import { 위로이동, 줄누르기, 줄있나, 줄제목들, 줄부제 } from '../helpers/system-ui.helper.js';

export class 계정설정화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 제목 = 앱id('real_title');

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 계정설정화면.제목, 시간);
  }

  async 제목글(): Promise<string> {
    if (!(await this.떴나())) return '';
    return this.driver.$(계정설정화면.제목).getText();
  }

  async 줄있나(글자: string, 시간 = 3_000): Promise<boolean> {
    return 줄있나(this.driver, 글자, 시간);
  }

  async 줄제목들(): Promise<string[]> {
    return 줄제목들(this.driver);
  }

  async 줄부제(글자: string): Promise<string> {
    return 줄부제(this.driver, 글자);
  }

  async 줄누르기(글자: string): Promise<void> {
    await 줄누르기(this.driver, 글자);
  }

  async 로그아웃누르기(): Promise<void> {
    await 줄누르기(this.driver, '로그아웃');
  }

  로그아웃창(): 확인창 {
    return new 확인창(this.driver);
  }

  async 위로누르기(): Promise<void> {
    await this.driver.$(위로이동).click();
  }
}
