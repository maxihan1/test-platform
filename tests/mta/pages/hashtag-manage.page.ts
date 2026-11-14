import { 하단탭 } from '../components/tab-bar.component.js';
import { 뜰때까지, type 앱 } from '../helpers/app.helper.js';
import { 글자누르기, 글자있나, 이미지버튼들 } from '../helpers/profile.helper.js';
import { 홈화면 } from './home.page.js';

export class 해시태그관리화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 탭: 하단탭;
  readonly 홈: 홈화면;
  readonly 제외버튼설명 = ['상위 메뉴로 이동', '뒤로 가기', '옵션 더보기'];

  constructor(private readonly driver: 앱) {
    this.탭 = new 하단탭(driver);
    this.홈 = new 홈화면(driver);
  }

  async 열기(): Promise<void> {
    await this.탭.누르기('홈');
    await 뜰때까지(this.driver, this.홈.글쓰기, 15_000);
    await this.홈.드롭다운열기();
    await 글자누르기(this.driver, '팔로우 중인 해시태그');
    await 글자누르기(this.driver, '해시태그 관리');
  }

  async 글자보이나(글자: string, 시간 = 10_000): Promise<boolean> {
    return 글자있나(this.driver, 글자, 시간);
  }

  async 해제버튼수(): Promise<number> {
    return (await 이미지버튼들(this.driver, this.제외버튼설명)).length;
  }

  async 해제버튼누르기(): Promise<void> {
    const [첫] = await 이미지버튼들(this.driver, this.제외버튼설명);
    if (!첫) throw new Error('해시태그 관리 줄의 해제 버튼을 찾지 못했다');
    await 첫.click();
  }

  async 줄누르기(태그: string): Promise<void> {
    await 글자누르기(this.driver, 태그);
  }
}
