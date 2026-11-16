import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지 } from '@platform/kit/parts';

export class 사람목록화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 제목 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/toolbar").childSelector(new UiSelector().className("android.widget.TextView"))';
  readonly 뒤로 = '~뒤로 가기';
  readonly 목록 = 'id=org.joinmastodon.android:id/list';
  readonly 줄사용자명 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/username"))';
  readonly 줄이름 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/name"))';

  constructor(private readonly driver: AppDriver) {}

  async 제목읽기(시간 = 15_000): Promise<string> {
    if (!(await 뜰때까지(this.driver, this.제목, 시간))) return '';
    return this.driver.$(this.제목).getText();
  }

  async 줄이뜰때까지(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.줄사용자명, 시간);
  }

  async 목록이뜰때까지(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.목록, 시간);
  }

  async 닫기(): Promise<void> {
    await this.driver.$(this.뒤로).click();
  }
}
