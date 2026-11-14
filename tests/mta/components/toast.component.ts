import type { 앱 } from '../helpers/app.helper.js';

export class 토스트 {
  readonly 상자 = '//android.widget.Toast';

  constructor(private readonly driver: 앱) {}

  async 글(시간 = 10_000): Promise<string> {
    const 상자 = await this.driver.$(this.상자);
    const 떴다 = await 상자.waitForExist({ timeout: 시간 }).then(
      () => true,
      () => false,
    );
    return 떴다 ? 상자.getText() : '';
  }
}
