import { 문구가보이나, 사라질때까지, 앱id, type 앱 } from '../helpers/app.helper.js';

export class 팔로워목록화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 프로필동작버튼 = 앱id('profile_action_btn');

  constructor(private readonly driver: 앱) {}

  async 떴나(): Promise<boolean> {
    return 사라질때까지(this.driver, this.프로필동작버튼, 15_000);
  }

  async 계정줄있나(): Promise<boolean> {
    return 문구가보이나(this.driver, '@');
  }
}
