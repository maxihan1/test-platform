import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지 } from '@platform/kit/parts';

import { 하단탭 } from '../components/tab-bar.component.js';

export class 둘러보기화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 탭: 하단탭;
  readonly 검색줄 = 'id=org.joinmastodon.android:id/search_text';
  readonly QR스캔 = '~QR 코드 스캔';
  readonly 안내글 = 'id=org.joinmastodon.android:id/banner_text';
  readonly 목록 = 'id=org.joinmastodon.android:id/list';
  readonly 첫글카드 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/clickable_thing").instance(0))';
  readonly 빈화면글 = 'id=org.joinmastodon.android:id/empty_text';
  readonly 해시태그글 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/pager").childSelector(new UiSelector().textStartsWith("#"))';

  constructor(private readonly driver: AppDriver) {
    this.탭 = new 하단탭(driver);
  }

  탭이름(이름: '게시물' | '해시태그' | '소식' | '추천'): string {
    return `~${이름}`;
  }

  async 그려질때까지(시간 = 20_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.검색줄, 시간);
  }

  async 열기(): Promise<boolean> {
    await this.driver.$(this.탭.둘러보기).click();
    return this.그려질때까지();
  }

  async 탭누르기(이름: '게시물' | '해시태그' | '소식' | '추천'): Promise<void> {
    await this.driver.$(this.탭이름(이름)).click();
  }

  async 아래로밀기(): Promise<void> {
    await this.driver.execute('mobile: swipeGesture', { elementId: (await this.driver.$(this.목록).getElement()).elementId, direction: 'up', percent: 0.9 });
  }
}
