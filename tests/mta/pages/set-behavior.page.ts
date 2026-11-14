import { 앱id, 뒤로, type 앱 } from '../helpers/app.helper.js';
import { 정확글보이나, 줄보이나, 줄부제, 줄상태, 줄누르기, 포함글수 } from '../helpers/settings.helper.js';

export class 동작설정화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 제목들 = 앱id('title');

  constructor(private readonly driver: 앱) {}

  async 떴나(시간 = 15_000): Promise<boolean> {
    return 줄보이나(this.driver, '링크 열기', 시간);
  }

  async 켜졌나(제목: string): Promise<boolean> {
    return (await 줄상태(this.driver, 제목)) === 'true';
  }

  async 꺼졌나(제목: string): Promise<boolean> {
    return (await 줄상태(this.driver, 제목)) === 'false';
  }

  async 부제글(제목: string): Promise<string> {
    return (await 줄부제(this.driver, 제목)).trim();
  }

  async 줄누르기(제목: string): Promise<void> {
    await 줄누르기(this.driver, 제목);
  }

  async 선택지보이나(글자: string): Promise<boolean> {
    return 정확글보이나(this.driver, 글자, 5_000);
  }

  async 글수(조각: string): Promise<number> {
    return 포함글수(this.driver, 조각);
  }

  async 선택창닫기(): Promise<void> {
    await 뒤로(this.driver);
  }
}
