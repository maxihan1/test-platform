import { 글자들, 문구가보이나, 앱id, type 앱 } from '../helpers/app.helper.js';
import { 정확글누르기, 줄누르기, 줄보이나, 줄부제, 줄활성, 포함글누르기 } from '../helpers/settings.helper.js';

export class 앱정보화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 제목들 = 앱id('title');

  constructor(private readonly driver: 앱) {}

  async 떴나(시간 = 15_000): Promise<boolean> {
    return 줄보이나(this.driver, '추가 설정', 시간);
  }

  async 제목글들(): Promise<string[]> {
    return 글자들(this.driver, this.제목들);
  }

  async 글보이나(문구: string): Promise<boolean> {
    return 문구가보이나(this.driver, 문구, 5_000);
  }

  async 줄누르기(제목: string): Promise<void> {
    await 줄누르기(this.driver, 제목);
  }

  async 부제글(제목: string): Promise<string> {
    return 줄부제(this.driver, 제목);
  }

  async 활성(제목: string): Promise<string> {
    return 줄활성(this.driver, 제목);
  }

  async 버전줄누르기(): Promise<void> {
    await 포함글누르기(this.driver, '안드로이드용 마스토돈');
  }

  async 단추누르기(글자: string): Promise<void> {
    await 정확글누르기(this.driver, 글자);
  }

  async 캐시가영이될때까지(): Promise<boolean> {
    return this.driver
      .waitUntil(async () => /^0([.,]0+)?\s?[^\d.,]*$/.test((await 줄부제(this.driver, '미디어 캐시 지우기')).trim()), { timeout: 10_000, interval: 500 })
      .then(
        () => true,
        () => false,
      );
  }
}
