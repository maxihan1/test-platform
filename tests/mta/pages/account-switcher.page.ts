import type { AppDriver } from '@platform/kit/app';
import { 글자들, 길게누르기, 뜰때까지 } from '@platform/kit/parts';

import { 하단탭 } from '../components/tab-bar.component.js';

export class 계정전환시트 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 탭: 하단탭;
  readonly 계정추가 = 'android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().text("계정 추가"))';
  readonly 모두로그아웃 = 'android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().text("모든 계정 로그아웃하기"))';
  readonly 이름들 = 'android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/name"))';
  readonly 사용자명들 = 'android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/username"))';

  constructor(private readonly driver: AppDriver) {
    this.탭 = new 하단탭(driver);
  }

  계정줄(사용자명줄: string): string {
    return `android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/username").text(${JSON.stringify(사용자명줄)}))`;
  }

  async 프로필탭길게누르기(): Promise<void> {
    await 길게누르기(this.driver, this.탭.프로필);
  }

  async 열기(): Promise<void> {
    await this.프로필탭길게누르기();
    await 뜰때까지(this.driver, this.계정추가, 10_000);
  }

  async 떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.계정추가, 시간);
  }

  async 사용자명읽기(): Promise<string[]> {
    return 글자들(this.driver, this.사용자명들);
  }

  async 이름읽기(): Promise<string[]> {
    return 글자들(this.driver, this.이름들);
  }

  async 계정추가누르기(): Promise<void> {
    await this.driver.$(this.계정추가).click();
  }

  async 모두로그아웃누르기(): Promise<void> {
    await this.driver.$(this.모두로그아웃).click();
  }

  async 계정고르기(사용자명줄: string): Promise<void> {
    await this.driver.$(this.계정줄(사용자명줄)).click();
  }
}
