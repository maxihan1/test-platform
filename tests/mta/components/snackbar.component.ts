import type { 앱 } from '../helpers/app.helper.js';

export class 스낵바 {
  readonly 글자 = 'id=org.joinmastodon.android:id/snackbar_text';

  constructor(private readonly driver: 앱) {}

  async 글(시간 = 10_000): Promise<string> {
    const 요소 = await this.driver.$(this.글자);
    const 떴다 = await 요소.waitForDisplayed({ timeout: 시간 }).then(
      () => true,
      () => false,
    );
    return 떴다 ? 요소.getText() : '';
  }
}
