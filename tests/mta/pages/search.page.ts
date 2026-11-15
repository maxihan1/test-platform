import type { AppDriver } from '@platform/kit/app';
import { 칸에적기, 키보드완료, 뜰때까지 } from '@platform/kit/parts';

import { 앱id, 목록안글자, 목록안글자포함 } from '../helpers/app.helper.js';
import { 검색입력칸, 검색화면열기 } from '../helpers/nav.helper.js';

export class 검색화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 입력칸 = 검색입력칸;
  readonly 입력지우기 = '~모두 지우기';
  readonly 빈결과글 = 앱id('empty_text');
  readonly 첫행제목 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/title").instance(0))';
  readonly 결과행제목 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/title"))';

  constructor(private readonly driver: AppDriver) {}

  행(글자: string): string {
    return 목록안글자(글자);
  }

  행포함(글자: string): string {
    return 목록안글자포함(글자);
  }

  async 열기(): Promise<boolean> {
    await 검색화면열기(this.driver);
    return 뜰때까지(this.driver, this.입력칸, 10_000);
  }

  async 적기(글: string): Promise<void> {
    await 칸에적기(await this.driver.$(this.입력칸).getElement(), 글);
  }

  async 완료키(): Promise<void> {
    await 키보드완료(this.driver);
  }

  async 입력칸글(): Promise<string> {
    return this.driver.$(this.입력칸).getText();
  }

  async 입력비우기(): Promise<void> {
    await this.driver.$(this.입력지우기).click();
  }
}
