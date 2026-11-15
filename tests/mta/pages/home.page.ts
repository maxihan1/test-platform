import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지 } from '@platform/kit/parts';

import { 뜨는메뉴 } from '../components/popup-menu.component.js';
import { 하단탭 } from '../components/tab-bar.component.js';

export class 홈화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 탭: 하단탭;
  readonly 메뉴: 뜨는메뉴;
  readonly 드롭다운 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/toolbar").childSelector(new UiSelector().className("android.widget.Spinner"))';
  readonly 드롭다운글 = 'android=new UiSelector().className("android.widget.Spinner").childSelector(new UiSelector().className("android.widget.TextView"))';
  readonly 설정 = 'id=org.joinmastodon.android:id/settings';
  readonly 목록관리 = 'id=org.joinmastodon.android:id/edit_list';
  readonly 옵션더보기 = '~옵션 더보기';
  readonly 글쓰기 = 'id=org.joinmastodon.android:id/fab';
  readonly 목록 = 'id=org.joinmastodon.android:id/list';
  readonly 글본문들 = 'id=org.joinmastodon.android:id/text';
  readonly 첫시간줄 = 'id=org.joinmastodon.android:id/time_and_username';
  readonly 첫이름 = 'id=org.joinmastodon.android:id/name';
  readonly 첫더보기 = 'id=org.joinmastodon.android:id/more';
  readonly 첫답장 = 'id=org.joinmastodon.android:id/reply_btn';
  readonly 첫부스트 = 'id=org.joinmastodon.android:id/boost_btn';
  readonly 첫좋아요 = 'id=org.joinmastodon.android:id/favorite_btn';
  readonly 첫공유 = 'id=org.joinmastodon.android:id/share_btn';
  readonly 첫좋아요수 = 'id=org.joinmastodon.android:id/favorite';
  readonly 새로고침 = 'id=org.joinmastodon.android:id/refresh_layout';
  readonly 빈화면글 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/appkit_loader_content").childSelector(new UiSelector().className("android.widget.TextView"))';

  constructor(private readonly driver: AppDriver) {
    this.탭 = new 하단탭(driver);
    this.메뉴 = new 뜨는메뉴(driver);
  }

  목록글자포함(글자: string): string {
    return `android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().textContains(${JSON.stringify(글자)}))`;
  }

  굴려서글자포함(글자: string): string {
    return `android=new UiScrollable(new UiSelector().resourceId("org.joinmastodon.android:id/list")).scrollIntoView(new UiSelector().textContains(${JSON.stringify(글자)}))`;
  }

  전체글자포함(글자: string): string {
    return `android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().textContains(${JSON.stringify(글자)}))`;
  }

  굴려서글자(글자: string): string {
    return `android=new UiScrollable(new UiSelector().resourceId("org.joinmastodon.android:id/list")).scrollIntoView(new UiSelector().text(${JSON.stringify(글자)}))`;
  }

  async 첫글본문(): Promise<string> {
    await 뜰때까지(this.driver, this.글본문들, 15_000);
    return this.driver.$(this.글본문들).getText();
  }

  async 메뉴세로위치(글자: string): Promise<number> {
    return (await this.driver.$(this.메뉴.항목(글자)).getLocation()).y;
  }

  async 그려질때까지(시간 = 30_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.글쓰기, 시간);
  }

  async 열기(): Promise<void> {
    await this.driver.$(this.탭.홈).click();
    await this.그려질때까지();
  }

  async 드롭다운열기(): Promise<void> {
    await this.driver.$(this.드롭다운).click();
  }

  async 피드고르기(이름: string): Promise<void> {
    await this.드롭다운열기();
    await this.메뉴.고르기(이름);
  }

  async 목록고르기(목록이름: string): Promise<void> {
    await this.드롭다운열기();
    await this.메뉴.고르기('목록');
    await this.메뉴.고르기(목록이름);
  }

  async 아래로밀기(): Promise<void> {
    await this.driver.execute('mobile: swipeGesture', { elementId: (await this.driver.$(this.목록).getElement()).elementId, direction: 'up', percent: 0.9 });
  }

  async 당겨서새로고침(): Promise<void> {
    await this.driver.execute('mobile: swipeGesture', { elementId: (await this.driver.$(this.목록).getElement()).elementId, direction: 'down', percent: 0.9 });
  }
}
