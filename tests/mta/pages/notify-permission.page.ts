import type { AppDriver } from '@platform/kit/app';
import { 권한창답하기, 뜰때까지 } from '@platform/kit/parts';

export class 알림권한창 {
  readonly 메시지 = 'id=com.android.permissioncontroller:id/permission_message';
  readonly 알림화면탭 = 'id=org.joinmastodon.android:id/all_tab';

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 30_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.메시지, 시간);
  }

  async 메시지글(): Promise<string> {
    return this.driver.$(this.메시지).getText();
  }

  async 답하기(답: '허용' | '거부'): Promise<boolean> {
    return 권한창답하기(this.driver, 답, 10_000);
  }

  async 알림화면떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.알림화면탭, 시간);
  }
}
