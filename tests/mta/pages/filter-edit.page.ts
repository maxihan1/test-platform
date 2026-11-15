import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지 } from '@platform/kit/parts';

export class 필터화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 추가버튼 = 'id=org.joinmastodon.android:id/fab';
  readonly 제목칸 = 'id=org.joinmastodon.android:id/edit';
  readonly 저장 = 'id=org.joinmastodon.android:id/save';
  readonly 제목줄들 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/title"))';
  readonly 부제줄들 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/subtitle"))';
  readonly 단어칸 = 'id=org.joinmastodon.android:id/edit';
  readonly 단어추가버튼 = 'id=android:id/button1';
  readonly 단어취소버튼 = 'id=android:id/button2';
  readonly 단어추가목록버튼 = 'id=org.joinmastodon.android:id/fab';

  constructor(private readonly driver: AppDriver) {}

  줄(글자: string): string {
    return `android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().text(${JSON.stringify(글자)}))`;
  }

  화면글(글자: string): string {
    return `android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().textContains(${JSON.stringify(글자)}))`;
  }

  화면글정확히(글자: string): string {
    return `android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().text(${JSON.stringify(글자)}))`;
  }

  async 편집그려질때까지(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.제목칸, 시간);
  }

  async 줄누르기(글자: string): Promise<void> {
    await this.driver.$(this.줄(글자)).click();
  }
}
