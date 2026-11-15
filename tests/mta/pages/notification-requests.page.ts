import type { AppDriver } from '@platform/kit/app';
import { 글자들, 뜰때까지 } from '@platform/kit/parts';

export class 알림요청화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 제목 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/toolbar").childSelector(new UiSelector().className("android.widget.TextView"))';
  readonly 이름들 = 'id=org.joinmastodon.android:id/name';
  readonly 첫이름 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/name").instance(0))';
  readonly 첫계정 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/username").instance(0))';
  readonly 첫배지 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/badge").instance(0))';
  readonly 배지들 = 'id=org.joinmastodon.android:id/badge';
  readonly 계정들 = 'id=org.joinmastodon.android:id/username';
  readonly 허용버튼 = '~알림 허용';
  readonly 해제버튼 = '~알림 요청 해제';

  constructor(private readonly driver: AppDriver) {}

  async 그려질때까지(시간 = 20_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.첫계정, 시간);
  }

  async 줄번호(계정: string): Promise<number> {
    const 글 = await 글자들(this.driver, this.계정들);
    return 글.indexOf(`@${계정}`);
  }

  계정줄(번호: number): string {
    return `android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/username").instance(${String(번호)}))`;
  }

  허용줄(번호: number): string {
    return `android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/btn_allow").instance(${String(번호)}))`;
  }
}
