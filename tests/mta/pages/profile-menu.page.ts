import { 메뉴 } from '../components/menu.component.js';
import { 하단탭 } from '../components/tab-bar.component.js';
import { 문구가보이나, 뒤로, 뜰때까지, 앱id, type 앱 } from '../helpers/app.helper.js';

export class 프로필메뉴 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 동작버튼 = 앱id('profile_action_btn');
  readonly 옵션 = 앱id('options_btn');

  readonly 탭: 하단탭;
  readonly 메뉴: 메뉴;

  constructor(private readonly driver: 앱) {
    this.탭 = new 하단탭(driver);
    this.메뉴 = new 메뉴(driver);
  }

  async 내프로필열기(): Promise<boolean> {
    await this.탭.누르기('프로필');
    return 뜰때까지(this.driver, this.동작버튼, 20_000);
  }

  async 고르기(항목: string): Promise<void> {
    await 뜰때까지(this.driver, this.옵션, 10_000);
    await this.driver.$(this.옵션).click();
    await this.메뉴.고르기(항목);
  }

  async 글보이나(문구: string, 시간 = 10_000): Promise<boolean> {
    return 문구가보이나(this.driver, 문구, 시간);
  }

  async 뒤로가기(): Promise<void> {
    await 뒤로(this.driver);
  }
}
