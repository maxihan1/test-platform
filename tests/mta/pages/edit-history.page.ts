import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지 } from '@platform/kit/parts';

import { 글읽기 } from '../helpers/app.helper.js';

export class 수정내역화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 제목 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/toolbar").childSelector(new UiSelector().className("android.widget.TextView"))';

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, 수정내역화면.제목, 시간);
  }

  async 제목글(): Promise<string> {
    return 글읽기(this.driver, 수정내역화면.제목, 10_000);
  }

  async 뒤로(): Promise<void> {
    await this.driver.back();
  }
}
