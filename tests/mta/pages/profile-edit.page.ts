import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지 } from '@platform/kit/parts';

import { 뜨는메뉴 } from '../components/popup-menu.component.js';

export class 프로필편집화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 메뉴: 뜨는메뉴;
  readonly 목록 = 'id=org.joinmastodon.android:id/list';
  readonly 제목 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/toolbar").childSelector(new UiSelector().className("android.widget.TextView"))';
  readonly 헤더이미지 = 'id=org.joinmastodon.android:id/cover';
  readonly 아바타 = 'id=org.joinmastodon.android:id/avatar';
  readonly 이름칸 = 'id=org.joinmastodon.android:id/edit';
  readonly 저장 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/toolbar").childSelector(new UiSelector().text("저장"))';
  readonly 자기소개칸 = 'android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().className("android.widget.EditText").instance(0))';
  readonly 항목추가 = 'id=org.joinmastodon.android:id/add';
  readonly 항목창칸 = 'android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().className("android.widget.EditText").instance(0))';
  readonly 항목창저장 = 'id=android:id/button1';
  readonly 항목창취소 = 'id=android:id/button2';
  readonly 탭설정제목들 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/title"))';
  readonly 탭설정스위치들 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().className("android.widget.Switch"))';

  constructor(private readonly driver: AppDriver) {
    this.메뉴 = new 뜨는메뉴(driver);
  }

  줄(글자: string): string {
    return `android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().text(${JSON.stringify(글자)}))`;
  }

  줄포함(글자: string): string {
    return `android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().textContains(${JSON.stringify(글자)}))`;
  }

  화면글(글자: string): string {
    return `android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().textContains(${JSON.stringify(글자)}))`;
  }

  async 그려질때까지(시간 = 20_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.줄('Display name'), 시간);
  }

  async 줄누르기(글자: string): Promise<void> {
    await this.driver.$(this.줄(글자)).click();
  }

  async 포함줄누르기(글자: string): Promise<void> {
    await this.driver.$(this.줄포함(글자)).click();
  }

  async 저장켜졌나(): Promise<boolean> {
    return (await this.driver.$(this.저장).getAttribute('enabled')) === 'true';
  }
}
