import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지 } from '@platform/kit/parts';

import { 꾸러미 } from '../helpers/app.helper.js';
import { 줄스위치켜졌나, 줄스위치있나 } from '../helpers/system-ui.helper.js';

export class 탭설정화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 제목 = `android=new UiSelector().resourceId("${꾸러미}:id/toolbar").childSelector(new UiSelector().text("Profile tab settings"))`;
  static readonly 하단안내 = `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().textStartsWith("These settings customize"))`;

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 탭설정화면.제목, 시간);
  }

  async 스위치있나(줄: string): Promise<boolean> {
    return 줄스위치있나(this.driver, 줄);
  }

  async 스위치켜졌나(줄: string): Promise<boolean> {
    return 줄스위치켜졌나(this.driver, 줄);
  }

  async 하단안내글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 탭설정화면.하단안내, 5_000))) return '';
    return this.driver.$(탭설정화면.하단안내).getText();
  }
}
