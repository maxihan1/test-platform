import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지 } from '@platform/kit/parts';

export class QR화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 저장 = 'android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().text("저장"))';
  readonly 저장됨 = 'android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().text("저장됨"))';

  constructor(private readonly driver: AppDriver) {}

  async 그려질때까지(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.저장, 시간);
  }

  async 저장누르기(): Promise<void> {
    await this.driver.$(this.저장).click();
  }
}
