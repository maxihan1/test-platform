import { 뜰때까지, type 앱 } from '../helpers/app.helper.js';

export class 확인창 {
  readonly 제목 = 'id=android:id/alertTitle';
  readonly 본문 = 'id=android:id/message';
  readonly 확인 = 'id=android:id/button1';
  readonly 취소 = 'id=android:id/button2';

  constructor(private readonly driver: 앱) {}

  async 떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.확인, 시간);
  }

  async 제목글(): Promise<string> {
    return this.driver.$(this.제목).getText();
  }

  async 본문글(): Promise<string> {
    return this.driver.$(this.본문).getText();
  }

  async 취소누르기(): Promise<void> {
    await this.driver.$(this.취소).click();
  }

  async 확인누르기(): Promise<void> {
    await this.driver.$(this.확인).click();
  }
}
