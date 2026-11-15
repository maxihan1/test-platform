import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지 } from '@platform/kit/parts';

export class 확인창 {
  readonly 제목 = 'id=org.joinmastodon.android:id/title';
  readonly 시스템제목 = 'id=android:id/alertTitle';
  readonly 내용 = 'id=android:id/message';
  readonly 확인버튼 = 'id=android:id/button1';
  readonly 취소버튼 = 'id=android:id/button2';
  readonly 셋째버튼 = 'id=android:id/button3';
  readonly 단추판 = 'id=android:id/buttonPanel';

  constructor(private readonly driver: AppDriver) {}

  안의글자(글자: string): string {
    return `android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().textContains(${JSON.stringify(글자)}))`;
  }

  async 뜰때까지(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.확인버튼, 시간);
  }

  async 확인(): Promise<void> {
    await this.driver.$(this.확인버튼).click();
  }

  async 취소(): Promise<void> {
    await this.driver.$(this.취소버튼).click();
  }
}
