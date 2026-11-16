import type { AppDriver } from '@platform/kit/app';
import { 글자들, 뜰때까지 } from '@platform/kit/parts';

export class 팔로워목록화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 툴바글들 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/toolbar").childSelector(new UiSelector().className("android.widget.TextView"))';
  readonly 이름들 = 'id=org.joinmastodon.android:id/name';
  readonly 계정들 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/username"))';
  readonly 팔로우버튼들 = 'id=org.joinmastodon.android:id/button';

  constructor(private readonly driver: AppDriver) {}

  async 그려질때까지(시간 = 20_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.이름들, 시간);
  }

  async 개수(선택자: string): Promise<number> {
    return (await this.driver.$$(선택자).getElements()).length;
  }

  async 글들(선택자: string): Promise<string[]> {
    return 글자들(this.driver, 선택자);
  }
}
