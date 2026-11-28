import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지, 사라질때까지, 스크롤해서찾기 } from '@platform/kit/parts';

import { 모든글자, 앱id } from '../helpers/app.helper.js';

export class 언어창 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 제목 = 앱id('title');
  static readonly 취소 = 'id=android:id/button1';
  static readonly 언어줄들 = 'android=new UiSelector().className("android.widget.CheckedTextView")';
  static readonly 기본값줄 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/title").text("기본값")';
  static readonly 기본값언어 = 앱id('text');

  static 언어줄(글자: string): string {
    return `android=new UiSelector().className("android.widget.CheckedTextView").text(${JSON.stringify(글자)})`;
  }

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 언어창.기본값줄, 시간);
  }

  async 닫혔나(시간 = 10_000): Promise<boolean> {
    return 사라질때까지(this.driver, 언어창.기본값줄, 시간);
  }

  async 제목글(): Promise<string> {
    return this.driver.$(언어창.제목).getText();
  }

  async 기본값줄있나(): Promise<boolean> {
    return 뜰때까지(this.driver, 언어창.기본값줄, 5_000);
  }

  async 기본값언어글(): Promise<string> {
    return this.driver.$(언어창.기본값언어).getText();
  }

  async 언어줄글들(): Promise<string[]> {
    return 모든글자(this.driver, 언어창.언어줄들);
  }

  async 언어줄있나(글자: string, 시간 = 3_000): Promise<boolean> {
    return 뜰때까지(this.driver, 언어창.언어줄(글자), 시간);
  }

  async 언어줄이있나(시간 = 5_000): Promise<boolean> {
    return 뜰때까지(this.driver, 언어창.언어줄들, 시간);
  }

  async 언어고르기(글자: string): Promise<void> {
    if (!(await this.언어줄있나(글자))) await 스크롤해서찾기(this.driver, 글자);
    await this.driver.$(언어창.언어줄(글자)).click();
  }

  async 기본값누르기(): Promise<void> {
    await this.driver.$(언어창.기본값줄).click();
  }

  async 취소있나(): Promise<boolean> {
    return 뜰때까지(this.driver, 언어창.취소, 5_000);
  }

  async 취소누르기(): Promise<void> {
    await this.driver.$(언어창.취소).click();
  }
}
