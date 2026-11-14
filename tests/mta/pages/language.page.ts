import { 뜰때까지, 앱id, type 앱 } from '../helpers/app.helper.js';

export class 언어선택화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 버튼 = 앱id('btn_language');

  constructor(private readonly driver: 앱) {}

  async 열기(): Promise<void> {
    await this.driver.$(this.버튼).click();
  }

  async 버튼떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.버튼, 시간);
  }
}
