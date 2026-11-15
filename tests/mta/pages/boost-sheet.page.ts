import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지 } from '@platform/kit/parts';

export class 부스트시트 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 손잡이 = 'id=org.joinmastodon.android:id/handle';

  constructor(private readonly driver: AppDriver) {}

  항목(글자: string): string {
    return `android=new UiSelector().resourceId("org.joinmastodon.android:id/title").text(${JSON.stringify(글자)})`;
  }

  전체글자포함(글자: string): string {
    return `android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().textContains(${JSON.stringify(글자)}))`;
  }

  async 뜰때까지(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.손잡이, 시간);
  }

  async 글자가뜰때까지(글자: string, 시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.전체글자포함(글자), 시간);
  }

  async 항목이뜰때까지(글자: string, 시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.항목(글자), 시간);
  }

  async 항목누르기(글자: string): Promise<void> {
    await 뜰때까지(this.driver, this.항목(글자));
    await this.driver.$(this.항목(글자)).click();
  }

  async 닫기(): Promise<void> {
    await this.driver.back();
  }
}
