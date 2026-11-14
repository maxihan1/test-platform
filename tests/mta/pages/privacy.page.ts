import { 글자들, 뜰때까지, 앱id, type 앱 } from '../helpers/app.helper.js';

const 정확글자 = (글: string): string => `android=new UiSelector().text(${JSON.stringify(글)})`;

export class 개인정보화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 제목 = 정확글자('당신의 개인정보');
  readonly 안내 = 앱id('text');
  readonly 링크제목들 = 앱id('title');
  readonly 링크부제들 = 앱id('subtitle');
  readonly 동의 = 앱id('btn_next');
  readonly 비동의 = 앱id('btn_back');

  constructor(private readonly driver: 앱) {}

  async 떴나(시간 = 20_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.제목, 시간);
  }

  async 글자가보이나(글: string, 시간 = 5_000): Promise<boolean> {
    return 뜰때까지(this.driver, 정확글자(글), 시간);
  }

  async 링크제목글자들(): Promise<string[]> {
    return 글자들(this.driver, this.링크제목들);
  }

  async 링크부제글자들(): Promise<string[]> {
    return 글자들(this.driver, this.링크부제들);
  }

  async 동의누르기(): Promise<void> {
    await this.driver.$(this.동의).click();
  }

  async 비동의누르기(): Promise<void> {
    await this.driver.$(this.비동의).click();
  }

  async 비동의글(): Promise<string> {
    return this.driver.$(this.비동의).getText();
  }
}
