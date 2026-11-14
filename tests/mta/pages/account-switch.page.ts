import { 확인창 } from '../components/dialog.component.js';
import { 글자들, 글자로고르기, 길게누르기, 문구가보이나, 뜰때까지, 앱id, type 앱 } from '../helpers/app.helper.js';
import { 줄보이나 } from '../helpers/settings.helper.js';

export class 계정전환시트 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 프로필탭 = 앱id('tab_profile');
  readonly 제목들 = 앱id('title');
  readonly 계정줄 = 'android=new UiSelector().textStartsWith("@")';

  readonly 확인: 확인창;

  constructor(private readonly driver: 앱) {
    this.확인 = new 확인창(driver);
  }

  async 열기(): Promise<void> {
    await 길게누르기(this.driver, this.프로필탭);
  }

  async 떴나(시간 = 10_000): Promise<boolean> {
    return 줄보이나(this.driver, '모든 계정 로그아웃하기', 시간);
  }

  async 글보이나(문구: string): Promise<boolean> {
    return 문구가보이나(this.driver, 문구, 5_000);
  }

  async 계정줄보이나(): Promise<boolean> {
    return 뜰때까지(this.driver, this.계정줄, 5_000);
  }

  async 계정줄누르기(): Promise<void> {
    await this.driver.$(this.계정줄).click();
  }

  async 제목글들(): Promise<string[]> {
    return 글자들(this.driver, this.제목들);
  }

  async 계정추가누르기(): Promise<void> {
    const 글 = (await this.제목글들()).find((제목) => 제목.startsWith('계정 추가'));
    if (글 === undefined) throw new Error('계정 전환 시트에 「계정 추가」 줄이 없다');
    await (await 글자로고르기(this.driver, this.제목들, 글)).click();
  }

  async 모든계정로그아웃누르기(): Promise<void> {
    await (await 글자로고르기(this.driver, this.제목들, '모든 계정 로그아웃하기')).click();
  }

  async 탭아바타보이나(): Promise<boolean> {
    return 뜰때까지(this.driver, 앱id('tab_profile_ava'), 10_000);
  }

  async 로그아웃창떴나(): Promise<boolean> {
    return this.확인.떴나();
  }

  async 로그아웃단추글(): Promise<string> {
    return this.driver.$(this.확인.확인).getText();
  }

  async 취소단추글(): Promise<string> {
    return this.driver.$(this.확인.취소).getText();
  }

  async 로그아웃확인누르기(): Promise<void> {
    await this.확인.확인누르기();
  }
}
