import type { AppDriver } from '@platform/kit/app';
import { 글자들, 뜰때까지 } from '@platform/kit/parts';

export class 서버규칙화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 제목 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/toolbar").childSelector(new UiSelector().className("android.widget.TextView"))';
  readonly 안내 = 'id=org.joinmastodon.android:id/text';
  readonly 동의 = 'id=org.joinmastodon.android:id/btn_next';
  readonly 동의안함 = 'id=org.joinmastodon.android:id/btn_back';
  readonly 목록글들 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().className("android.widget.TextView"))';

  constructor(private readonly driver: AppDriver) {}

  async 그려질때까지(시간 = 20_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.안내, 시간);
  }

  async 글(칸: '제목' | '안내' | '동의' | '동의안함'): Promise<string> {
    return this.driver.$(this[칸]).getText();
  }

  async 동의누르기(): Promise<void> {
    await this.driver.$(this.동의).click();
  }

  async 동의안함누르기(): Promise<void> {
    await this.driver.$(this.동의안함).click();
  }

  async 규칙줄수(): Promise<number> {
    const 안내글 = await this.driver.$(this.안내).getText();
    const 모두 = await 글자들(this.driver, this.목록글들);
    return 모두.filter((글) => 글 !== 안내글).length;
  }
}
