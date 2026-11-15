import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지 } from '@platform/kit/parts';

export class 보관함화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  constructor(private readonly driver: AppDriver) {}

  화면글(글자: string): string {
    return `android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().textContains(${JSON.stringify(글자)}))`;
  }

  async 안내뜰때까지(글자: string, 시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.화면글(글자), 시간);
  }
}
