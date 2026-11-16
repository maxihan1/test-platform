import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지 } from '@platform/kit/parts';

export class 알림설정화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 목록 = 'id=org.joinmastodon.android:id/list';

  constructor(private readonly driver: AppDriver) {}

  종류(글자: string): string {
    return `android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().text(${JSON.stringify(글자)}))`;
  }

  켜진종류(글자: string): string {
    return `android=new UiSelector().checked(true).childSelector(new UiSelector().text(${JSON.stringify(글자)}))`;
  }

  async 그려질때까지(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.목록, 시간);
  }

  async 종류그려질때까지(글자: string, 시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.종류(글자), 시간);
  }

  async 켜졌나(글자: string, 시간 = 5_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.켜진종류(글자), 시간);
  }
}
