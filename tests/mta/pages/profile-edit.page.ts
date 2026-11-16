import type { AppDriver } from '@platform/kit/app';
import { 글자들, 뜰때까지 } from '@platform/kit/parts';

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
  readonly 항목라벨칸 = 'id=org.joinmastodon.android:id/label';
  readonly 항목내용칸 = 'id=org.joinmastodon.android:id/value';
  readonly 항목삭제버튼 = 'id=org.joinmastodon.android:id/delete';
  readonly 항목손잡이 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/dragger_thingy"))';
  readonly 목록제목들 = 'id=org.joinmastodon.android:id/title';
  readonly 항목도움말 = 'id=org.joinmastodon.android:id/help_text';
  readonly 해시태그칸 = 'id=org.joinmastodon.android:id/edit';
  readonly 툴바추가 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/toolbar").childSelector(new UiSelector().text("추가"))';

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

  항목수정버튼(순서: number): string {
    return `android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/edit").instance(${String(순서)}))`;
  }

  해시태그지우기버튼(순서: number): string {
    return `android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/trailing_icon").instance(${String(순서)}))`;
  }

  async 화면제목(): Promise<string> {
    return (await 글자들(this.driver, this.제목))[0] ?? '';
  }

  async 목록제목글들(): Promise<string[]> {
    return 글자들(this.driver, this.목록제목들);
  }

  async 툴바추가켜졌나(): Promise<boolean> {
    return (await this.driver.$(this.툴바추가).getAttribute('enabled')) === 'true';
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
