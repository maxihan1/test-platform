import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지 } from '@platform/kit/parts';

export class 설정화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 목록 = 'id=org.joinmastodon.android:id/list';
  readonly 뒤로 = '~상위 메뉴로 이동';
  readonly 부제 = 'id=org.joinmastodon.android:id/subtitle';
  readonly 계정제목 = 'id=org.joinmastodon.android:id/real_title';
  readonly 안내글 = 'id=org.joinmastodon.android:id/text';
  readonly 줄제목들 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/title"))';
  readonly 스위치들 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().className("android.widget.Switch"))';
  readonly 제목 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/toolbar").childSelector(new UiSelector().className("android.widget.TextView"))';

  constructor(private readonly driver: AppDriver) {}

  줄(글자: string): string {
    return `android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().text(${JSON.stringify(글자)}))`;
  }

  굴려서줄(글자: string): string {
    return `android=new UiScrollable(new UiSelector().resourceId("org.joinmastodon.android:id/list")).scrollIntoView(new UiSelector().text(${JSON.stringify(글자)}))`;
  }

  스위치(순서: number): string {
    return `android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().className("android.widget.Switch").instance(${String(순서)}))`;
  }

  async 그려질때까지(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.목록, 시간);
  }

  async 줄누르기(글자: string): Promise<void> {
    await this.driver.$(this.굴려서줄(글자)).click();
  }

  부제순서(순서: number): string {
    return `android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/subtitle").instance(${String(순서)}))`;
  }

  화면글정확히(글자: string): string {
    return `android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().text(${JSON.stringify(글자)}))`;
  }

  글포함(글자: string): string {
    return `android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().textContains(${JSON.stringify(글자)}))`;
  }

  async 스위치바꾸기(순서: number): Promise<void> {
    await this.driver.$(this.스위치(순서)).click();
  }

  async 줄켜졌나(글자: string): Promise<boolean> {
    return (await this.driver.$(this.굴려서줄(글자)).getAttribute('enabled')) === 'true';
  }

  async 켜졌나(순서: number): Promise<boolean> {
    return (await this.driver.$(this.스위치(순서)).getAttribute('checked')) === 'true';
  }
}
