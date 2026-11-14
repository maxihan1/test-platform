import { 뜰때까지, 앱id, type 앱 } from '../helpers/app.helper.js';

export class 공개범위시트 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 손잡이 = 앱id('handle');
  readonly 설명 = 앱id('subtitle');
  readonly 공개범위선택 = 앱id('visibility_spinner');
  readonly 인용정책선택 = 앱id('quote_policy_spinner');
  readonly 취소 = 앱id('cancel');
  readonly 저장 = 앱id('save');
  readonly 선택글 = 'id=android:id/text1';

  constructor(private readonly driver: 앱) {}

  async 떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.저장, 시간);
  }

  async 설명글(): Promise<string> {
    const 요소 = await this.driver.$(this.설명);
    await 요소.waitForDisplayed({ timeout: 10_000 });
    return 요소.getText();
  }

  async 공개범위열기(): Promise<void> {
    await this.driver.$(this.공개범위선택).click();
  }

  async 인용정책열기(): Promise<void> {
    await this.driver.$(this.인용정책선택).click();
  }

  async 공개범위글(): Promise<string> {
    return this.driver.$(this.공개범위선택).$(this.선택글).getText();
  }

  async 인용정책글(): Promise<string> {
    return this.driver.$(this.인용정책선택).$(this.선택글).getText();
  }

  async 인용정책이될때까지(글: string, 시간 = 10_000): Promise<boolean> {
    return this.driver
      .waitUntil(async () => (await this.인용정책글()) === 글, { timeout: 시간, interval: 500 })
      .then(
        () => true,
        () => false,
      );
  }

  async 고르기(글자: string): Promise<void> {
    const 요소 = await this.driver.$(`android=new UiSelector().text(${JSON.stringify(글자)})`);
    await 요소.waitForDisplayed({ timeout: 10_000 });
    await 요소.click();
  }

  async 취소누르기(): Promise<void> {
    await this.driver.$(this.취소).click();
  }

  async 저장누르기(): Promise<void> {
    await this.driver.$(this.저장).click();
  }
}
