import type { AppDriver } from '@platform/kit/app';
import { 글자들, 뜰때까지 } from '@platform/kit/parts';

export class 해시태그관리화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 제목 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/toolbar").childSelector(new UiSelector().className("android.widget.TextView"))';
  readonly 줄제목들 = 'id=org.joinmastodon.android:id/title';
  readonly 줄요약들 = 'id=org.joinmastodon.android:id/subtitle';
  readonly 줄아이콘들 = 'id=org.joinmastodon.android:id/icon';
  readonly 해제버튼들 = 'id=org.joinmastodon.android:id/options_btn';
  readonly 첫해제버튼 = 'id=org.joinmastodon.android:id/options_btn';
  readonly 해제메뉴항목 = 'id=android:id/title';

  constructor(private readonly driver: AppDriver) {}

  줄(태그: string): string {
    return `android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/title").text(${JSON.stringify(태그)}))`;
  }

  async 그려질때까지(시간 = 20_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.줄제목들, 시간);
  }

  async 개수(선택자: string): Promise<number> {
    return (await this.driver.$$(선택자).getElements()).length;
  }

  async 글들(선택자: string): Promise<string[]> {
    return 글자들(this.driver, 선택자);
  }

  async 줄누르기(태그: string): Promise<void> {
    await this.driver.$(this.줄(태그)).click();
  }

  async 첫해제버튼누르기(): Promise<void> {
    await this.driver.$(this.첫해제버튼).click();
  }
}
