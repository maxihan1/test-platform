import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지 } from '@platform/kit/parts';

import { 글읽기, 모든글자, 앱id } from '../helpers/app.helper.js';

export class 계정목록화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 제목 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/toolbar").childSelector(new UiSelector().className("android.widget.TextView"))';
  static readonly 계정들 = 앱id('username');
  static readonly 오류글 = 앱id('error_text');

  static 계정줄(사용자명: string): string {
    return `android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/username").text(${JSON.stringify(`@${사용자명}`)}))`;
  }

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, 계정목록화면.제목, 시간);
  }

  async 제목글(): Promise<string> {
    return 글읽기(this.driver, 계정목록화면.제목, 10_000);
  }

  async 계정글들(): Promise<string[]> {
    await 뜰때까지(this.driver, 계정목록화면.계정들, 10_000);
    return 모든글자(this.driver, 계정목록화면.계정들);
  }

  async 계정있나(사용자명: string, 시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 계정목록화면.계정줄(사용자명), 시간);
  }

  async 오류글읽기(): Promise<string> {
    return 글읽기(this.driver, 계정목록화면.오류글, 10_000);
  }

  async 뒤로(): Promise<void> {
    await this.driver.back();
  }
}
