import { 뜰때까지, 앱id, type 앱 } from '../helpers/app.helper.js';
import { 정확글누르기 } from '../helpers/settings.helper.js';

export class 인용정책시트 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 정책칸 = 앱id('quote_policy_spinner');
  readonly 칸글 = 'id=android:id/text1';
  readonly 저장 = 앱id('save');
  readonly 취소 = 앱id('cancel');

  constructor(private readonly driver: 앱) {}

  async 떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.정책칸, 시간);
  }

  async 정책글(): Promise<string> {
    return this.driver.$(this.정책칸).$(this.칸글).getText();
  }

  async 정책고르기(글: string): Promise<void> {
    await this.driver.$(this.정책칸).click();
    await 정확글누르기(this.driver, 글);
  }

  async 저장누르기(): Promise<void> {
    await this.driver.$(this.저장).click();
  }

  async 취소누르기(): Promise<void> {
    await this.driver.$(this.취소).click();
  }
}
