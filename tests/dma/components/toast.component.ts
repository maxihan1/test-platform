import type { 앱 } from '../helpers/app.helper.js';

export class 토스트 {
  constructor(private readonly driver: 앱) {}

  get 상자() {
    return this.driver.$('id=toast');
  }

  private async 모든창에서<T>(일: () => Promise<T>): Promise<T> {
    await this.driver.updateSettings({ enableMultiWindows: true });
    try {
      return await 일();
    } finally {
      await this.driver.updateSettings({ enableMultiWindows: false });
    }
  }

  async 뜰때까지(timeout = 15000): Promise<void> {
    await this.모든창에서(() => this.상자.waitForDisplayed({ timeout }));
  }

  async 보이나(): Promise<boolean> {
    return this.모든창에서(() => this.상자.isDisplayed());
  }

  async 글(): Promise<string> {
    return this.모든창에서(async () => {
      await this.상자.waitForDisplayed({ timeout: 15000 });
      return this.상자.$('android.widget.TextView').getText();
    });
  }

  async 글이바뀔때까지(앞글: string, timeout = 15000): Promise<void> {
    await this.모든창에서(() =>
      this.driver.waitUntil(
        async () => (await this.상자.isDisplayed()) && (await this.상자.$('android.widget.TextView').getText()) !== 앞글,
        { timeout, interval: 200, timeoutMsg: '새 토스트가 뜨지 않았다' },
      ),
    );
  }

  async 사라질때까지(timeout = 15000): Promise<void> {
    await this.모든창에서(() => this.상자.waitForDisplayed({ timeout, reverse: true }));
  }

  async 개수(): Promise<number> {
    return this.모든창에서(async () => (await this.driver.$$('id=toast')).length);
  }

  async 화면아래쪽인가(): Promise<boolean> {
    return this.모든창에서(async () => {
      const 자리 = await this.상자.getLocation();
      const 화면 = await this.driver.getWindowSize();
      return 자리.y > 화면.height / 2;
    });
  }
}
