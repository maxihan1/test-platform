import { 글자가든요소, 글자로고르기, 뜰때까지, 서버, 앱id, 문구가보이나, type 앱 } from '../helpers/app.helper.js';

export class 알림설정화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 줄제목들 = 앱id('title');
  readonly 제목 = 'android=new UiSelector().text("모두 일시 중지")';

  constructor(private readonly driver: 앱) {}

  async 설정에서열기(): Promise<void> {
    await (await 글자가든요소(this.driver, `@${서버}`)).click();
    await (await 글자로고르기(this.driver, this.줄제목들, '알림')).click();
  }

  async 떴나(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.제목, 시간);
  }

  async 글이보이나(문구: string, 시간 = 10_000): Promise<boolean> {
    return 문구가보이나(this.driver, 문구, 시간);
  }
}
