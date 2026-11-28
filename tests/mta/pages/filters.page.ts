import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지 } from '@platform/kit/parts';

import { 앱id } from '../helpers/app.helper.js';
import { 위로이동, 줄누르기, 줄부제, 줄있나, 줄제목들, 툴바글자 } from '../helpers/system-ui.helper.js';

export class 필터목록화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 제목 = 툴바글자('필터');
  static readonly 추가버튼 = 앱id('fab');

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 필터목록화면.제목, 시간);
  }

  async 줄제목들(): Promise<string[]> {
    return 줄제목들(this.driver);
  }

  async 줄있나(글자: string, 시간 = 3_000): Promise<boolean> {
    return 줄있나(this.driver, 글자, 시간);
  }

  async 줄상태(글자: string): Promise<string> {
    return 줄부제(this.driver, 글자);
  }

  async 줄누르기(글자: string): Promise<void> {
    await 줄누르기(this.driver, 글자);
  }

  async 추가있나(시간 = 5_000): Promise<boolean> {
    return 뜰때까지(this.driver, 필터목록화면.추가버튼, 시간);
  }

  async 추가버튼글(): Promise<string> {
    return this.driver.$(필터목록화면.추가버튼).getText();
  }

  async 추가누르기(): Promise<void> {
    if (!(await this.추가있나(10_000))) throw new Error('필터 목록 「필터 추가」 버튼이 안 보인다');
    await this.driver.$(필터목록화면.추가버튼).click();
  }

  async 위로누르기(): Promise<void> {
    await this.driver.$(위로이동).click();
  }
}
