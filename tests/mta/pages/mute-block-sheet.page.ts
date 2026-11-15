import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지 } from '@platform/kit/parts';

export class 뮤트차단시트 {
  constructor(private readonly driver: AppDriver) {}

  글(글자: string): string {
    return `android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().textContains(${JSON.stringify(글자)}))`;
  }

  단추(글자: string): string {
    return `android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().text(${JSON.stringify(글자)}))`;
  }

  async 뜰때까지(글자: string, 시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.글(글자), 시간);
  }

  async 단추누르기(글자: string): Promise<void> {
    await 뜰때까지(this.driver, this.단추(글자), 10_000);
    await this.driver.$(this.단추(글자)).click();
  }
}
