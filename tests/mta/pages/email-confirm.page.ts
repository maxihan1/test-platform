import { 뜰때까지, 문구가보이나, type 앱 } from '../helpers/app.helper.js';

const 정확글자 = (글: string): string => `android=new UiSelector().text(${JSON.stringify(글)})`;

export class 이메일확인화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 제목 = 정확글자('수신함 확인하기');
  readonly 되묻기 = 정확글자('?');
  readonly 재전송 = 'android=new UiSelector().textStartsWith("재전송")';

  constructor(private readonly driver: 앱) {}

  async 떴나(시간 = 60_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.제목, 시간);
  }

  async 안내가보이나(문구: string): Promise<boolean> {
    return 문구가보이나(this.driver, 문구);
  }

  async 되묻기가보이나(): Promise<boolean> {
    return 뜰때까지(this.driver, this.되묻기, 5_000);
  }

  async 재전송누르기(): Promise<void> {
    const 버튼 = await this.driver.$(this.재전송);
    await 버튼.waitForDisplayed({ timeout: 10_000 });
    await 버튼.click();
  }

  async 재전송글(): Promise<string> {
    return this.driver.$(this.재전송).getText();
  }

  async 재전송켜졌나(): Promise<boolean> {
    return (await this.driver.$(this.재전송).getAttribute('enabled')) === 'true';
  }

  async 재전송이잠길때까지(시간 = 10_000): Promise<boolean> {
    return this.driver
      .waitUntil(async () => /^재전송 \(\d+\)$/.test(await this.재전송글()), { timeout: 시간, interval: 300 })
      .then(
        () => true,
        () => false,
      );
  }

  async 남은초(): Promise<number> {
    return Number(/\((\d+)\)/.exec(await this.재전송글())?.[1] ?? Number.NaN);
  }
}
