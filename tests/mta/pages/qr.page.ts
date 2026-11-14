import { 글자들, 뜰때까지, 앱id, type 앱 } from '../helpers/app.helper.js';

export class QR화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 공유 = 앱id('share_btn');
  readonly 저장 = 앱id('save_btn');
  readonly 저장글자 = 앱id('save_text');
  readonly QR스캔 = '~QR 코드 스캔';

  constructor(private readonly driver: 앱) {}

  async 떴나(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.저장, 시간);
  }

  async 보이나(선택자: string): Promise<boolean> {
    return 뜰때까지(this.driver, 선택자);
  }

  async 저장누르기(): Promise<void> {
    await this.driver.$(this.저장).click();
  }

  async 저장글(): Promise<string> {
    return (await 글자들(this.driver, this.저장글자)).join(', ');
  }

  async 저장글이될때까지(글: string, 시간 = 15_000): Promise<boolean> {
    return this.driver
      .waitUntil(async () => (await this.저장글()) === 글, { timeout: 시간, interval: 500 })
      .then(
        () => true,
        () => false,
      );
  }
}
