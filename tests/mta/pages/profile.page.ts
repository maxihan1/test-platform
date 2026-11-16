import type { AppDriver } from '@platform/kit/app';
import { 글자들, 뜰때까지 } from '@platform/kit/parts';

import { 뜨는메뉴 } from '../components/popup-menu.component.js';

export class 프로필화면 {
  static readonly 주소 = 'app:.MainActivity/타임라인';

  readonly 메뉴: 뜨는메뉴;
  readonly 헤더이미지 = 'id=org.joinmastodon.android:id/cover';
  readonly 아바타 = 'id=org.joinmastodon.android:id/avatar';
  readonly 이름 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/name_wrap").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/name"))';
  readonly 이름줄 = 'id=org.joinmastodon.android:id/name_wrap';
  readonly 역할배지들 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/badges").childSelector(new UiSelector().className("android.widget.TextView"))';
  readonly 이름줄글칸들 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/name_wrap").childSelector(new UiSelector().className("android.widget.TextView"))';
  readonly 계정 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/profile_header").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/username"))';
  readonly 팔로워 = 'id=org.joinmastodon.android:id/followers_btn';
  readonly 팔로워글 = 'id=org.joinmastodon.android:id/followers_label';
  readonly 팔로잉 = 'id=org.joinmastodon.android:id/following_btn';
  readonly 팔로잉글 = 'id=org.joinmastodon.android:id/following_label';
  readonly 글수 = 'id=org.joinmastodon.android:id/posts_count';
  readonly 가입일 = 'id=org.joinmastodon.android:id/join_date';
  readonly 아는팔로워 = 'id=org.joinmastodon.android:id/familiar_followers_label';
  readonly 자기소개 = 'id=org.joinmastodon.android:id/bio';
  readonly 동작버튼 = 'id=org.joinmastodon.android:id/profile_action_btn';
  readonly 알림종 = 'id=org.joinmastodon.android:id/notifications_btn';
  readonly 메뉴버튼 = 'id=org.joinmastodon.android:id/options_btn';
  readonly 탭줄 = 'id=org.joinmastodon.android:id/tabbar';
  readonly 필터제목 = 'id=org.joinmastodon.android:id/filter_title';
  readonly 필터버튼 = 'id=org.joinmastodon.android:id/filter_button';
  readonly 글목록 = 'id=org.joinmastodon.android:id/list';
  readonly 첫글더보기 = 'id=org.joinmastodon.android:id/more';
  readonly 해시태그칩들 = 'id=org.joinmastodon.android:id/hashtags';
  readonly 항목들 = 'id=org.joinmastodon.android:id/fields';
  readonly 굴려서더보기 = 'android=new UiScrollable(new UiSelector().resourceId("org.joinmastodon.android:id/scroller")).scrollIntoView(new UiSelector().resourceId("org.joinmastodon.android:id/more"))';
  readonly 항목값들 = 'id=org.joinmastodon.android:id/value';
  readonly 목록글본문들 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/text"))';

  constructor(private readonly driver: AppDriver) {
    this.메뉴 = new 뜨는메뉴(driver);
  }

  탭(이름: string): string {
    return `~${이름}`;
  }

  배지(글자: string): string {
    return `android=new UiSelector().resourceId("org.joinmastodon.android:id/profile_header").childSelector(new UiSelector().text(${JSON.stringify(글자)}))`;
  }

  굴려서글자포함(글자: string): string {
    return `android=new UiScrollable(new UiSelector().resourceId("org.joinmastodon.android:id/scroller")).scrollIntoView(new UiSelector().textContains(${JSON.stringify(글자)}))`;
  }

  굴려서메뉴항목(글자: string): string {
    return `android=new UiScrollable(new UiSelector().scrollable(true).instance(0)).scrollIntoView(new UiSelector().className("android.widget.TextView").text(${JSON.stringify(글자)}))`;
  }

  카운터글(글자: string): string {
    return `android=new UiSelector().resourceId("org.joinmastodon.android:id/profile_counters").childSelector(new UiSelector().text(${JSON.stringify(글자)}))`;
  }

  글자포함(글자: string): string {
    return `android=new UiSelector().resourceId("org.joinmastodon.android:id/scrollable_content").childSelector(new UiSelector().textContains(${JSON.stringify(글자)}))`;
  }

  async 그려질때까지(시간 = 20_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.동작버튼, 시간);
  }

  async 동작글(): Promise<string> {
    return this.driver.$(this.동작버튼).getText();
  }

  async 동작켜졌나(): Promise<boolean> {
    return (await this.driver.$(this.동작버튼).getAttribute('enabled')) === 'true';
  }

  async 동작누르기(): Promise<void> {
    await this.driver.$(this.동작버튼).click();
  }

  async 메뉴항목누르기(글자: string): Promise<void> {
    if (await 뜰때까지(this.driver, this.메뉴.항목(글자), 3_000)) {
      await this.driver.$(this.메뉴.항목(글자)).click();
      return;
    }
    await this.driver.$(this.굴려서메뉴항목(글자)).click();
  }

  async 메뉴열기(): Promise<void> {
    await this.driver.$(this.메뉴버튼).click();
  }

  해시태그칩(글자: string): string {
    return `android=new UiSelector().resourceId("org.joinmastodon.android:id/hashtags").childSelector(new UiSelector().text(${JSON.stringify(글자)}))`;
  }

  async 글들(선택자: string): Promise<string[]> {
    return 글자들(this.driver, 선택자);
  }

  async 항목값누르기(순서: number): Promise<void> {
    const 요소 = (await this.driver.$$(this.항목값들).getElements())[순서];
    if (!요소) throw new Error(`프로필 항목 값 ${String(순서)}번째가 없다`);
    await 요소.click();
  }

  async 이름줄배지글들(): Promise<string[]> {
    return 글자들(this.driver, this.역할배지들);
  }
}
