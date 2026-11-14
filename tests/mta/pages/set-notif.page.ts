import { 글자들, 뒤로, 앱id, type 앱 } from '../helpers/app.helper.js';
import { 문구가보이나 } from '../helpers/app.helper.js';
import { 정확글누르기, 정확글보이나, 줄누르기, 줄보이나, 줄부제, 줄상태, 포함글수 } from '../helpers/settings.helper.js';

export class 계정알림설정화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 부제들 = 앱id('subtitle');

  constructor(private readonly driver: 앱) {}

  async 떴나(시간 = 15_000): Promise<boolean> {
    return 줄보이나(this.driver, '알림 받기', 시간);
  }

  async 줄보이나(제목: string): Promise<boolean> {
    return 줄보이나(this.driver, 제목, 5_000);
  }

  async 켜졌나(제목: string): Promise<boolean> {
    return (await 줄상태(this.driver, 제목)) === 'true';
  }

  async 부제글(제목: string): Promise<string> {
    return 줄부제(this.driver, 제목);
  }

  async 부제글들(): Promise<string[]> {
    return 글자들(this.driver, this.부제들);
  }

  async 줄누르기(제목: string): Promise<void> {
    await 줄누르기(this.driver, 제목);
  }

  async 선택지보이나(글자: string): Promise<boolean> {
    return 정확글보이나(this.driver, 글자, 5_000);
  }

  async 선택지수(조각: string): Promise<number> {
    return 포함글수(this.driver, 조각);
  }

  async 선택지고르기(글자: string): Promise<void> {
    await 정확글누르기(this.driver, 글자);
  }

  async 창보이나(제목: string): Promise<boolean> {
    return 문구가보이나(this.driver, 제목, 5_000);
  }

  async 지금재개보이나(): Promise<boolean> {
    return 정확글보이나(this.driver, '지금 재개', 10_000);
  }

  async 글보이나(문구: string): Promise<boolean> {
    return 문구가보이나(this.driver, 문구, 10_000);
  }

  async 지금재개누르기(): Promise<void> {
    await 정확글누르기(this.driver, '지금 재개');
  }

  async 창닫기(): Promise<void> {
    await 뒤로(this.driver);
  }

  async 종료부제보이나(): Promise<boolean> {
    return this.driver
      .waitUntil(async () => /에 종료$/.test(await 줄부제(this.driver, '모두 일시 중지')), { timeout: 10_000, interval: 500 })
      .then(
        () => true,
        () => false,
      );
  }
}
