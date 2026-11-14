import { 문구가보이나, type 앱 } from '../helpers/app.helper.js';

export class 수정기록화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  constructor(private readonly driver: 앱) {}

  async 글보이나(문구: string, 시간 = 10_000): Promise<boolean> {
    return 문구가보이나(this.driver, 문구, 시간);
  }
}
