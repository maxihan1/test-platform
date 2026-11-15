import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지 } from '@platform/kit/parts';

import { 하단탭 } from '../components/tab-bar.component.js';

export class 알림화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 탭: 하단탭;
  readonly 제외조건버튼 = '~알림 제외 조건...';
  readonly 모든것탭 = 'id=org.joinmastodon.android:id/all_tab';
  readonly 멘션탭 = 'id=org.joinmastodon.android:id/mentions_tab';
  readonly 모든것글 = 'id=org.joinmastodon.android:id/all_text';
  readonly 멘션글 = 'id=org.joinmastodon.android:id/mentions_text';
  readonly 목록 = 'id=org.joinmastodon.android:id/list';
  readonly 필터링줄 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/title"))';
  readonly 필터링부제 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/subtitle"))';
  readonly 확정버튼 = 'id=org.joinmastodon.android:id/notification_approve';
  readonly 삭제버튼 = 'id=org.joinmastodon.android:id/notification_decline';
  readonly 글카드답장 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/reply_btn"))';
  readonly 정책창제목 = 'android=new UiSelector().resourceId("android:id/topPanel").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/title"))';
  readonly 정책항목제목들 = 'android=new UiSelector().resourceId("android:id/custom").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/title"))';
  readonly 정책항목부제들 = 'android=new UiSelector().resourceId("android:id/custom").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/subtitle"))';
  readonly 정책저장 = 'id=android:id/button1';

  constructor(private readonly driver: AppDriver) {
    this.탭 = new 하단탭(driver);
  }

  목록글자포함(글자: string): string {
    return `android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().textContains(${JSON.stringify(글자)}))`;
  }

  굴려서글자포함(글자: string): string {
    return `android=new UiScrollable(new UiSelector().resourceId("org.joinmastodon.android:id/list")).scrollIntoView(new UiSelector().textContains(${JSON.stringify(글자)}))`;
  }

  async 그려질때까지(시간 = 20_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.제외조건버튼, 시간);
  }

  async 열기(): Promise<boolean> {
    await this.driver.$(this.탭.알림).click();
    return this.그려질때까지();
  }

  async 멘션탭누르기(): Promise<void> {
    await this.driver.$(this.멘션탭).click();
  }

  async 선택됨(탭: 'all' | 'mentions'): Promise<boolean> {
    return (await this.driver.$(탭 === 'all' ? this.모든것탭 : this.멘션탭).getAttribute('selected')) === 'true';
  }

  async 정책창열기(): Promise<boolean> {
    await this.driver.$(this.제외조건버튼).click();
    return 뜰때까지(this.driver, this.정책창제목, 10_000);
  }

  async 필터링줄열기(): Promise<void> {
    await this.driver.$(this.필터링줄).click();
  }
}
