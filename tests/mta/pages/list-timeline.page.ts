import { 홈화면 } from './home.page.js';
import { 메뉴 } from '../components/menu.component.js';
import { 뜰때까지, 앱id, type 앱 } from '../helpers/app.helper.js';
import { 정확글누르기 } from '../helpers/settings.helper.js';

export class 목록타임라인화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 글본문들 = 앱id('text');
  readonly 옵션더보기 = '~옵션 더보기';
  readonly 관리단추 = '~목록 관리';

  readonly 홈: 홈화면;
  readonly 메뉴: 메뉴;

  constructor(private readonly driver: 앱) {
    this.홈 = new 홈화면(driver);
    this.메뉴 = new 메뉴(driver);
  }

  async 홈에서열기(이름: string): Promise<void> {
    await this.홈.드롭다운열기();
    await 정확글누르기(this.driver, '목록');
    await 정확글누르기(this.driver, 이름);
  }

  async 글보이나(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.글본문들, 시간);
  }

  async 메뉴항목들(): Promise<string[]> {
    await this.driver.$(this.옵션더보기).click();
    return this.메뉴.항목글자();
  }
}
