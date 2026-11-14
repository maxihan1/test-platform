import { 글자들, 사라질때까지, 뜰때까지, 앱id, type 앱 } from '../helpers/app.helper.js';

const 정확글자 = (글: string): string => `android=new UiSelector().text(${JSON.stringify(글)})`;

export class 서버규칙화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 제목 = 정확글자('서버 규칙');
  readonly 안내 = 앱id('text');
  readonly 동의 = 앱id('btn_next');
  readonly 동의안함 = 앱id('btn_back');
  readonly 목록안글들 = '//*[@resource-id="org.joinmastodon.android:id/list"]//android.widget.TextView';

  constructor(private readonly driver: 앱) {}

  async 떴나(시간 = 30_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.제목, 시간);
  }

  async 닫혔나(시간 = 10_000): Promise<boolean> {
    return 사라질때까지(this.driver, this.제목, 시간);
  }

  async 제목이보이나(): Promise<boolean> {
    return 뜰때까지(this.driver, this.제목, 5_000);
  }

  async 안내글(): Promise<string> {
    return this.driver.$(this.안내).getText();
  }

  async 동의글(): Promise<string> {
    return this.driver.$(this.동의).getText();
  }

  async 동의안함글(): Promise<string> {
    return this.driver.$(this.동의안함).getText();
  }

  async 규칙글자들(): Promise<string[]> {
    const 안내 = await this.안내글();
    return (await 글자들(this.driver, this.목록안글들)).filter((글) => 글 !== 안내);
  }

  async 동의누르기(): Promise<void> {
    await this.driver.$(this.동의).click();
  }

  async 동의안함누르기(): Promise<void> {
    await this.driver.$(this.동의안함).click();
  }
}
