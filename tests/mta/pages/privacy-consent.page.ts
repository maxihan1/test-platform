import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지, 보이나 } from '@platform/kit/parts';

export class 개인정보화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 제목 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/toolbar").childSelector(new UiSelector().className("android.widget.TextView"))';
  readonly 안내 = 'id=org.joinmastodon.android:id/text';
  readonly 앱정책제목 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/title").instance(0))';
  readonly 앱정책요약 = 'id=org.joinmastodon.android:id/subtitle';
  readonly 서버정책링크 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/title").instance(1))';
  readonly 이용약관링크 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().textContains("약관"))';
  readonly 동의 = 'id=org.joinmastodon.android:id/btn_next';
  readonly 비동의 = 'id=org.joinmastodon.android:id/btn_back';

  constructor(private readonly driver: AppDriver) {}

  async 그려질때까지(시간 = 20_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.안내, 시간);
  }

  async 글(칸: '안내' | '앱정책제목' | '앱정책요약'): Promise<string> {
    return this.driver.$(this[칸]).getText();
  }

  async 서버정책링크보이나(): Promise<boolean> {
    return 보이나(this.driver, this.서버정책링크);
  }

  async 이용약관링크보이나(): Promise<boolean> {
    return 보이나(this.driver, this.이용약관링크);
  }

  async 동의누르기(): Promise<void> {
    await this.driver.$(this.동의).click();
  }

  async 비동의누르기(): Promise<void> {
    await this.driver.$(this.비동의).click();
  }
}
