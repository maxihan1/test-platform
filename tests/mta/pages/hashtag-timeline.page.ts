import { 하단탭 } from '../components/tab-bar.component.js';
import { 앱id, 뜰때까지, type 앱 } from '../helpers/app.helper.js';
import { 글자누르기, 글자있나, 확인창이면누르기 } from '../helpers/profile.helper.js';
import { 홈화면 } from './home.page.js';

export class 해시태그타임라인화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 탭: 하단탭;
  readonly 홈: 홈화면;
  readonly 더보기 = '~옵션 더보기';

  constructor(private readonly driver: 앱) {
    this.탭 = new 하단탭(driver);
    this.홈 = new 홈화면(driver);
  }

  async 홈에서열기(태그: string): Promise<void> {
    await this.탭.누르기('홈');
    await 뜰때까지(this.driver, this.홈.글쓰기, 15_000);
    await this.홈.드롭다운열기();
    await 글자누르기(this.driver, '팔로우 중인 해시태그');
    await 글자누르기(this.driver, 태그);
  }

  async 둘러보기에서열기(태그: string): Promise<void> {
    await this.탭.누르기('둘러보기');
    await this.driver.$('~해시태그').click();
    await 글자누르기(this.driver, 태그, 20_000);
  }

  async 글자보이나(글자: string, 시간 = 10_000): Promise<boolean> {
    return 글자있나(this.driver, 글자, 시간);
  }

  async 팔로우누르기(): Promise<void> {
    await 글자누르기(this.driver, '팔로우');
  }

  async 팔로우해제하기(): Promise<void> {
    await 글자누르기(this.driver, '팔로잉');
    await 확인창이면누르기(this.driver);
  }

  async 더보기누르기(): Promise<void> {
    await this.driver.$(this.더보기).click();
  }

  async 앱id보이나(이름: string): Promise<boolean> {
    return 뜰때까지(this.driver, 앱id(이름));
  }
}
