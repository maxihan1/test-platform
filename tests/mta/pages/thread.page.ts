import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지, 요소안에서밀기 } from '@platform/kit/parts';

import { 글카드 } from '../components/status-card.component.js';
import { 글읽기, 누르기, 앱id, 있나 } from '../helpers/app.helper.js';

export class 글상세화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 제목 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/toolbar").childSelector(new UiSelector().className("android.widget.TextView"))';
  static readonly 목록 = 앱id('list');
  static readonly 답장막대 = 앱id('reply_button');
  static readonly 답장막대글 = 앱id('reply_btn_text');
  static readonly 시간 = 앱id('time');
  static readonly 날짜 = 앱id('date');
  static readonly 앱이름 = 앱id('app_name');
  static readonly 부스트수 = 앱id('reblogs');
  static readonly 인용수 = 앱id('quotes');
  static readonly 좋아요수 = 앱id('favorites');
  static readonly 오류글 = 앱id('error_text');

  static 안내시트글(글자: string): string {
    return `android=new UiSelector().text(${JSON.stringify(글자)})`;
  }

  readonly 카드: 글카드;

  constructor(private readonly driver: AppDriver) {
    this.카드 = new 글카드(driver);
  }

  async 떴나(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, 글상세화면.답장막대, 시간);
  }

  async 제목(): Promise<string> {
    return 글읽기(this.driver, 글상세화면.제목, 10_000);
  }

  async 답장막대글읽기(): Promise<string> {
    return 글읽기(this.driver, 글상세화면.답장막대글, 10_000);
  }

  async 답장막대누르기(): Promise<void> {
    await 누르기(this.driver, 글상세화면.답장막대, 10_000);
  }

  async 푸터까지내리기(번 = 6): Promise<boolean> {
    for (let i = 0; i <= 번; i++) {
      if (await 뜰때까지(this.driver, 글상세화면.좋아요수, 2_000)) return true;
      if (i < 번) await 요소안에서밀기(this.driver, 글상세화면.목록, '위');
    }
    return false;
  }

  async 시간글(): Promise<string> {
    return 글읽기(this.driver, 글상세화면.시간, 10_000);
  }

  async 날짜글(): Promise<string> {
    return 글읽기(this.driver, 글상세화면.날짜, 10_000);
  }

  async 앱이름글(): Promise<string> {
    return 글읽기(this.driver, 글상세화면.앱이름, 10_000);
  }

  async 부스트수글(): Promise<string> {
    return 글읽기(this.driver, 글상세화면.부스트수, 10_000);
  }

  async 인용수글(): Promise<string> {
    return 글읽기(this.driver, 글상세화면.인용수, 10_000);
  }

  async 좋아요수글(): Promise<string> {
    return 글읽기(this.driver, 글상세화면.좋아요수, 10_000);
  }

  async 시간누르기(): Promise<void> {
    await 누르기(this.driver, 글상세화면.시간, 10_000);
  }

  async 부스트수누르기(): Promise<void> {
    await 누르기(this.driver, 글상세화면.부스트수, 10_000);
  }

  async 인용수누르기(): Promise<void> {
    await 누르기(this.driver, 글상세화면.인용수, 10_000);
  }

  async 좋아요수누르기(): Promise<void> {
    await 누르기(this.driver, 글상세화면.좋아요수, 10_000);
  }

  async 푸터있나(): Promise<boolean> {
    return 있나(this.driver, 글상세화면.좋아요수);
  }

  async 당겨서새로고침(): Promise<void> {
    await 요소안에서밀기(this.driver, 글상세화면.목록, '아래');
  }

  async 오류글읽기(): Promise<string> {
    return 글읽기(this.driver, 글상세화면.오류글, 10_000);
  }

  async 안내시트글있나(글자: string, 시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 글상세화면.안내시트글(글자), 시간);
  }

  async 안내시트글누르기(글자: string): Promise<void> {
    await 누르기(this.driver, 글상세화면.안내시트글(글자), 10_000);
  }

  async 뒤로(): Promise<void> {
    await this.driver.back();
  }
}
