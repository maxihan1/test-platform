import { 뒤로, type 앱 } from '../helpers/app.helper.js';
import { 정확글누르기, 정확글보이나, 줄보이나, 줄부제, 줄상태, 줄누르기, 포함글수 } from '../helpers/settings.helper.js';

export class 디스플레이설정화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  constructor(private readonly driver: 앱) {}

  async 떴나(시간 = 15_000): Promise<boolean> {
    return 줄보이나(this.driver, '테마-화면 스타일', 시간);
  }

  async 줄보이나(제목: string): Promise<boolean> {
    return 줄보이나(this.driver, 제목, 5_000);
  }

  async 켜졌나(제목: string): Promise<boolean> {
    return (await 줄상태(this.driver, 제목)) === 'true';
  }

  async 부제글(제목: string): Promise<string> {
    return (await 줄부제(this.driver, 제목)).trim();
  }

  async 줄누르기(제목: string): Promise<void> {
    await 줄누르기(this.driver, 제목);
  }

  async 줄끄기(제목: string): Promise<void> {
    if (await this.켜졌나(제목)) await 줄누르기(this.driver, 제목);
  }

  async 선택지수(조각: string): Promise<number> {
    return 포함글수(this.driver, 조각);
  }

  async 선택지고르기(글자: string): Promise<void> {
    await 정확글누르기(this.driver, 글자);
  }

  async 선택지보이나(글자: string): Promise<boolean> {
    return 정확글보이나(this.driver, 글자, 5_000);
  }

  async 뒤로가기(): Promise<void> {
    await 뒤로(this.driver);
  }

  async 부제가될때까지(제목: string, 값: string): Promise<boolean> {
    return this.driver
      .waitUntil(async () => (await 줄부제(this.driver, 제목)).trim() === 값, { timeout: 10_000, interval: 500 })
      .then(
        () => true,
        () => false,
      );
  }
}
