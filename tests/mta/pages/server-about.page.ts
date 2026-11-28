import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지 } from '@platform/kit/parts';

import { 꾸러미, 앱id } from '../helpers/app.helper.js';
import { 위로이동 } from '../helpers/system-ui.helper.js';

export class 서버소개화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 서버이름 = 앱id('real_title');
  static readonly 관리자라벨 = `android=new UiSelector().resourceId("${꾸러미}:id/server_about").childSelector(new UiSelector().text("관리자"))`;
  static readonly 관리자이름 = 앱id('name');
  static readonly 관리자계정 = 앱id('username');

  static 탭(글자: string): string {
    return `~${글자}`;
  }

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, 서버소개화면.서버이름, 시간);
  }

  async 서버이름글(): Promise<string> {
    return this.driver.$(서버소개화면.서버이름).getText();
  }

  async 탭있나(글자: string, 시간 = 5_000): Promise<boolean> {
    return 뜰때까지(this.driver, 서버소개화면.탭(글자), 시간);
  }

  async 탭골라졌나(글자: string): Promise<boolean> {
    return (await this.driver.$(서버소개화면.탭(글자)).getAttribute('selected')) === 'true';
  }

  async 탭누르기(글자: string): Promise<void> {
    if (!(await this.탭있나(글자, 10_000))) throw new Error(`서버 소개 탭 「${글자}」이 안 보인다`);
    await this.driver.$(서버소개화면.탭(글자)).click();
  }

  async 관리자있나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 서버소개화면.관리자라벨, 시간);
  }

  async 관리자이름글(): Promise<string> {
    return this.driver.$(서버소개화면.관리자이름).getText();
  }

  async 관리자계정글(): Promise<string> {
    return this.driver.$(서버소개화면.관리자계정).getText();
  }

  async 위로누르기(): Promise<void> {
    await this.driver.$(위로이동).click();
  }
}
