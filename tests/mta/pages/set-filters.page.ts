import { 글자들, 앱id, type 앱 } from '../helpers/app.helper.js';
import { 정확글누르기, 정확글보이나, 줄누르기 } from '../helpers/settings.helper.js';

export class 필터목록화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 제목들 = 앱id('title');
  readonly 부제들 = 앱id('subtitle');

  constructor(private readonly driver: 앱) {}

  async 떴나(시간 = 15_000): Promise<boolean> {
    return 정확글보이나(this.driver, '필터 추가', 시간);
  }

  async 제목글들(): Promise<string[]> {
    return 글자들(this.driver, this.제목들);
  }

  async 부제글들(): Promise<string[]> {
    return 글자들(this.driver, this.부제들);
  }

  async 줄누르기(제목: string): Promise<void> {
    await 줄누르기(this.driver, 제목);
  }

  async 추가누르기(): Promise<void> {
    await 정확글누르기(this.driver, '필터 추가');
  }
}
