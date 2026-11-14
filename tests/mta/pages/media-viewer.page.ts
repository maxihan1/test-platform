import { 글자가든요소, 문구가보이나, type 앱 } from '../helpers/app.helper.js';

export class 미디어뷰어화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  constructor(private readonly driver: 앱) {}

  async 떴나(시간 = 15_000): Promise<boolean> {
    return 문구가보이나(this.driver, '다운로드', 시간);
  }

  async 글자보이나(글자: string, 시간 = 10_000): Promise<boolean> {
    return 문구가보이나(this.driver, 글자, 시간);
  }

  async 글열기(본문조각: string): Promise<void> {
    await (await 글자가든요소(this.driver, 본문조각)).click();
  }

  async 다운로드누르기(): Promise<void> {
    await this.driver.$('~다운로드').click();
  }
}
