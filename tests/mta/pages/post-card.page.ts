import type { AppDriver } from '@platform/kit/app';
import { 될때까지, 뜰때까지, 보이나 } from '@platform/kit/parts';

import { 뜨는메뉴 } from '../components/popup-menu.component.js';

export class 글카드 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 메뉴: 뜨는메뉴;
  readonly 목록 = 'id=org.joinmastodon.android:id/list';
  readonly 배지 = 'id=org.joinmastodon.android:id/badge';
  readonly 더보기 = 'id=org.joinmastodon.android:id/more';
  readonly 이름 = 'id=org.joinmastodon.android:id/name';
  readonly 시간줄 = 'id=org.joinmastodon.android:id/time_and_username';
  readonly 사진 = 'id=org.joinmastodon.android:id/photo';
  readonly 답장 = 'id=org.joinmastodon.android:id/reply_btn';
  readonly 부스트 = 'id=org.joinmastodon.android:id/boost_btn';
  readonly 오디오재생버튼들 = 'id=org.joinmastodon.android:id/play_pause_btn';
  readonly 인용단계들 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().textContains("님에 의해 인용된 게시물"))';

  constructor(private readonly driver: AppDriver) {
    this.메뉴 = new 뜨는메뉴(driver);
  }

  굴려서글자포함(글자: string, 번 = 8): string {
    return `android=new UiScrollable(new UiSelector().resourceId("org.joinmastodon.android:id/list")).setMaxSearchSwipes(${String(번)}).scrollIntoView(new UiSelector().textContains(${JSON.stringify(글자)}))`;
  }

  굴려서글자(글자: string, 번 = 8): string {
    return `android=new UiScrollable(new UiSelector().resourceId("org.joinmastodon.android:id/list")).setMaxSearchSwipes(${String(번)}).scrollIntoView(new UiSelector().text(${JSON.stringify(글자)}))`;
  }

  굴려서설명포함(글자: string, 번 = 8): string {
    return `android=new UiScrollable(new UiSelector().resourceId("org.joinmastodon.android:id/list")).setMaxSearchSwipes(${String(번)}).scrollIntoView(new UiSelector().descriptionContains(${JSON.stringify(글자)}))`;
  }

  굴려서아이디(이름: string, 번 = 8): string {
    return `android=new UiScrollable(new UiSelector().resourceId("org.joinmastodon.android:id/list")).setMaxSearchSwipes(${String(번)}).scrollIntoView(new UiSelector().resourceId("org.joinmastodon.android:id/${이름}"))`;
  }

  async 글자나설명이보일때까지(글자: string, 시간 = 25_000): Promise<boolean> {
    return 될때까지(
      this.driver,
      async () => (await 보이나(this.driver, this.굴려서글자포함(글자))) || (await 보이나(this.driver, this.굴려서설명포함(글자))),
      시간,
    );
  }

  async 글자가보일때까지(글자: string, 시간 = 25_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.굴려서글자포함(글자), 시간);
  }

  async 사진누르기(): Promise<void> {
    await this.driver.$(this.굴려서아이디('photo')).click();
  }

  async 첫글열기(): Promise<void> {
    await this.driver.$(this.굴려서아이디('time_and_username')).click();
  }

  async 첫글더보기열기(): Promise<void> {
    await this.driver.$(this.굴려서아이디('more')).click();
  }

  async 첫이름읽기(): Promise<string> {
    return this.driver.$(this.굴려서아이디('name')).getText();
  }

  async 한쪽내리기(): Promise<void> {
    await this.driver.execute('mobile: swipeGesture', { elementId: (await this.driver.$(this.목록).getElement()).elementId, direction: 'up', percent: 0.8 });
  }

  async 더보기메뉴에서찾기(글자: string, 쪽 = 3): Promise<boolean> {
    for (let 한쪽 = 0; 한쪽 < 쪽; 한쪽 += 1) {
      const 개수 = (await this.driver.$$(this.더보기).getElements()).length;
      for (let 순서 = 0; 순서 < 개수; 순서 += 1) {
        const 버튼 = (await this.driver.$$(this.더보기).getElements())[순서];
        if (버튼 === undefined) break;
        await 버튼.click();
        if (await 뜰때까지(this.driver, this.메뉴.항목포함(글자), 3_000)) return true;
        await this.driver.back();
      }
      await this.한쪽내리기();
    }
    return false;
  }

  async 투표버튼켜졌나(): Promise<boolean> {
    return (await this.driver.$(this.굴려서글자('투표')).getAttribute('enabled')) === 'true';
  }

  async 투표항목누르기(항목글: string): Promise<void> {
    await this.driver.$(this.굴려서글자(항목글)).click();
  }
}
