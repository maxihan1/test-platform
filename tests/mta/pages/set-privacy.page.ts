import { 글자들, type 앱 } from '../helpers/app.helper.js';
import { 줄보이나, 줄상태, 줄누르기 } from '../helpers/settings.helper.js';
import { 앱id } from '../helpers/app.helper.js';

export class 프라이버시설정화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 제목들 = 앱id('title');

  constructor(private readonly driver: 앱) {}

  async 떴나(시간 = 15_000): Promise<boolean> {
    return 줄보이나(this.driver, '탐색 알고리즘에서 프로필과 게시물 우선 노출', 시간);
  }

  async 제목글들(): Promise<string[]> {
    return 글자들(this.driver, this.제목들);
  }

  async 켜졌나(제목: string): Promise<boolean> {
    return (await 줄상태(this.driver, 제목)) === 'true';
  }

  async 줄누르기(제목: string): Promise<void> {
    await 줄누르기(this.driver, 제목);
  }
}
