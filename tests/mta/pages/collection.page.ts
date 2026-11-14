import { 글자가든요소, 문구가보이나, type 앱 } from '../helpers/app.helper.js';

export class 컬렉션화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 더보기 = '~옵션 더보기';

  constructor(private readonly driver: 앱) {}

  async 열기(이름: string): Promise<void> {
    await (await 글자가든요소(this.driver, 이름)).click();
  }

  async 떴나(시간 = 15_000): Promise<boolean> {
    return 문구가보이나(this.driver, 'by @', 시간);
  }

  async 글자보이나(글자: string, 시간 = 10_000): Promise<boolean> {
    return 문구가보이나(this.driver, 글자, 시간);
  }

  async 더보기누르기(): Promise<void> {
    await this.driver.$(this.더보기).click();
  }

  async 글누르기(글조각: string): Promise<void> {
    await (await 글자가든요소(this.driver, 글조각)).click();
  }
}
