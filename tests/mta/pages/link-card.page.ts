import { 뜰때까지, 앱id, type 앱 } from '../helpers/app.helper.js';

export class 링크카드화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 카드 = 앱id('inner');
  readonly 제목 = 앱id('title');
  readonly 설명 = 앱id('description');
  readonly 이미지 = 앱id('photo');
  readonly 작성자앞 = 앱id('author_before');
  readonly 작성자뒤 = 앱id('author_after');
  readonly 작성자 = 앱id('author_name');

  constructor(private readonly driver: 앱) {}

  async 떴나(시간 = 20_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.카드, 시간);
  }
}
