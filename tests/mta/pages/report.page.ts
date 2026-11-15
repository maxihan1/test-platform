import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지, 먼저뜨는것 } from '@platform/kit/parts';

export class 신고화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 제목 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/toolbar").childSelector(new UiSelector().className("android.widget.TextView"))';
  readonly 질문 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/title").instance(0))';
  readonly 안내 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/subtitle").instance(0))';
  readonly 다음 = 'id=org.joinmastodon.android:id/btn_next';
  readonly 다음글 = 'android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().text("다음"))';
  readonly 의견칸 = 'android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().className("android.widget.EditText").instance(0))';

  constructor(private readonly driver: AppDriver) {}

  이유(글자: string): string {
    return `android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().text(${JSON.stringify(글자)}))`;
  }

  화면글(글자: string): string {
    return `android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().textContains(${JSON.stringify(글자)}))`;
  }

  화면글정확히(글자: string): string {
    return `android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().text(${JSON.stringify(글자)}))`;
  }

  async 그려질때까지(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.다음, 시간);
  }

  async 이유고르기(글자: string): Promise<void> {
    await this.driver.$(this.이유(글자)).click();
  }

  async 첫다음누르기(): Promise<void> {
    await 뜰때까지(this.driver, `android=new UiSelector().resourceId("org.joinmastodon.android:id/btn_next").enabled(true)`, 10_000);
    await this.driver.$(this.다음).click();
  }

  async 다음누르기(): Promise<void> {
    await 뜰때까지(this.driver, this.다음글, 15_000);
    await this.driver.$(this.다음글).click();
  }

  async 의견화면까지(): Promise<boolean> {
    const 뜬것 = await 먼저뜨는것(
      this.driver,
      { 게시물: this.화면글('게시물이 있나요?'), 의견: this.화면글('우리가 더 알아야 할 내용이 있나요?') },
      15_000,
    );
    if (뜬것 === '게시물') await this.다음누르기();
    return 뜰때까지(this.driver, this.화면글('우리가 더 알아야 할 내용이 있나요?'), 15_000);
  }

  async 눌러보기(글자: string): Promise<void> {
    await this.driver.$(this.화면글정확히(글자)).click();
  }
}
