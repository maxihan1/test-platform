import type { AppDriver } from '@platform/kit/app';
import { 보이나, 뜰때까지 } from '@platform/kit/parts';

import { 뜨는메뉴 } from '../components/popup-menu.component.js';

export class 글상세화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 메뉴: 뜨는메뉴;
  readonly 제목 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/toolbar").childSelector(new UiSelector().className("android.widget.TextView"))';
  readonly 뒤로 = '~뒤로 가기';
  readonly 이름 = 'id=org.joinmastodon.android:id/name';
  readonly 시간과계정 = 'id=org.joinmastodon.android:id/time_and_username';
  readonly 본문 = 'id=org.joinmastodon.android:id/text';
  readonly 더보기 = 'id=org.joinmastodon.android:id/more';
  readonly 시간 = 'id=org.joinmastodon.android:id/time';
  readonly 날짜 = 'id=org.joinmastodon.android:id/date';
  readonly 부스트수 = 'id=org.joinmastodon.android:id/reblogs';
  readonly 인용수 = 'id=org.joinmastodon.android:id/quotes';
  readonly 좋아요수 = 'id=org.joinmastodon.android:id/favorites';
  readonly 답장 = 'id=org.joinmastodon.android:id/reply_btn';
  readonly 부스트 = 'id=org.joinmastodon.android:id/boost_btn';
  readonly 좋아요 = 'id=org.joinmastodon.android:id/favorite_btn';
  readonly 공유 = 'id=org.joinmastodon.android:id/share_btn';
  readonly 답장막대글 = 'id=org.joinmastodon.android:id/reply_btn_text';
  readonly 부스트시트목록 = 'id=org.joinmastodon.android:id/list';

  constructor(private readonly driver: AppDriver) {
    this.메뉴 = new 뜨는메뉴(driver);
  }

  글쓴이아바타(사용자명: string): string {
    return `~${사용자명} 님의 프로필로 이동`;
  }

  목록글자(글자: string): string {
    return `android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().text(${JSON.stringify(글자)}))`;
  }

  목록글자포함(글자: string): string {
    return `android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().textContains(${JSON.stringify(글자)}))`;
  }

  readonly 인용정책칸 = 'id=org.joinmastodon.android:id/quote_policy_spinner';
  readonly 인용정책취소 = 'id=org.joinmastodon.android:id/cancel';

  전체글자포함(글자: string): string {
    return `android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().textContains(${JSON.stringify(글자)}))`;
  }

  async 좋아요개수(): Promise<number> {
    const 글 = (await 보이나(this.driver, this.좋아요수)) ? await this.driver.$(this.좋아요수).getText() : '';
    const 숫자 = /\d+/.exec(글);
    return 숫자 === null ? 0 : Number(숫자[0]);
  }

  async 그려질때까지(시간 = 20_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.답장막대글, 시간);
  }

  async 더보기열기(): Promise<void> {
    await this.driver.$(this.더보기).click();
  }
}
