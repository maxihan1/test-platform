import type { AppDriver } from '@platform/kit/app';
import { 토스트글 } from '@platform/kit/parts';

export class 알림글 {
  readonly 시스템토스트 = '//android.widget.Toast';
  readonly 스낵바 = 'id=org.joinmastodon.android:id/snackbar_text';

  constructor(private readonly driver: AppDriver) {}

  async 토스트(시간 = 10_000): Promise<string> {
    return 토스트글(this.driver, this.시스템토스트, 시간);
  }

  async 스낵바글(시간 = 10_000): Promise<string> {
    return 토스트글(this.driver, this.스낵바, 시간);
  }
}
