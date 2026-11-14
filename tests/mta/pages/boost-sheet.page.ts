import { 글자들, 글자로고르기, 뜰때까지, 앱id, type 앱 } from '../helpers/app.helper.js';

export class 부스트시트 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 손잡이 = 앱id('handle');
  readonly 항목들 = 앱id('title');

  constructor(private readonly driver: 앱) {}

  async 떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.손잡이, 시간);
  }

  async 항목글자(): Promise<string[]> {
    await this.driver.$(this.항목들).waitForDisplayed({ timeout: 10_000 });
    return 글자들(this.driver, this.항목들);
  }

  async 고르기(글자: string): Promise<void> {
    await (await 글자로고르기(this.driver, this.항목들, 글자)).click();
  }
}
