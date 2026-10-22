import type { 앱 } from '../helpers/app.helper.js';

export class 토스트 {
  constructor(private readonly driver: 앱) {}

  get 틀() {
    return this.driver.$('~toast');
  }

  async 뜰때까지(시간 = 15000): Promise<boolean> {
    return this.틀.waitForDisplayed({ timeout: 시간 }).then(() => true, () => false);
  }

  async 글(시간 = 15000): Promise<string> {
    if (!(await this.뜰때까지(시간))) return '';
    return this.틀.$('android.widget.TextView').getText().catch(() => '');
  }

  async 글바뀔때까지(글: string, 시간 = 15000): Promise<boolean> {
    return this.driver
      .waitUntil(async () => (await this.틀.$('android.widget.TextView').getText().catch(() => '')) === 글, { timeout: 시간 })
      .then(() => true, () => false);
  }

  async 개수(): Promise<number> {
    return (await this.driver.$$('~toast').getElements()).length;
  }

  async 보이는가(): Promise<boolean> {
    return this.틀.isDisplayed().catch(() => false);
  }
}
