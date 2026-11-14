import { 하단탭 } from '../components/tab-bar.component.js';
import { 메뉴 } from '../components/menu.component.js';
import { 글자가든요소, 글자들, 문구가보이나, 보이나, 앱id, 뒤로, 뜰때까지, 사라질때까지, 위로밀기, type 앱, type 요소 } from '../helpers/app.helper.js';
import { 글자누르기 } from '../helpers/profile.helper.js';

export class 프로필화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 탭: 하단탭;
  readonly 메뉴: 메뉴;
  readonly 동작버튼 = 앱id('profile_action_btn');
  readonly 옵션버튼 = 앱id('options_btn');
  readonly 동작줄 = 앱id('profile_actions');
  readonly 팔로워수 = 앱id('followers_btn');
  readonly 팔로잉수 = 앱id('following_btn');
  readonly 이름들 = 앱id('name');
  readonly 계정들 = 앱id('username');
  readonly 헤더이미지 = '~헤더 이미지';
  readonly 아바타 = '~프로필 이미지';
  readonly 가입날짜 = 앱id('join_date');
  readonly 필터제목 = 앱id('filter_title');
  readonly 필터버튼 = '~필터';
  readonly 배지들 = 앱id('badge');
  readonly 사진들 = 앱id('photo');
  readonly 탭줄 = 앱id('tabbar');

  constructor(private readonly driver: 앱) {
    this.탭 = new 하단탭(driver);
    this.메뉴 = new 메뉴(driver);
  }

  async 내프로필열기(): Promise<boolean> {
    await this.탭.누르기('프로필');
    return 뜰때까지(this.driver, this.동작버튼, 20_000);
  }

  async 떴나(시간 = 20_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.동작버튼, 시간);
  }

  async 보이나(선택자: string): Promise<boolean> {
    return 보이나(this.driver, 선택자);
  }

  async 동작버튼글(): Promise<string> {
    return (await 글자들(this.driver, this.동작버튼)).join(', ');
  }

  async 동작버튼글이될때까지(글: string, 시간 = 10_000): Promise<boolean> {
    return this.driver
      .waitUntil(async () => (await this.동작버튼글()) === 글, { timeout: 시간, interval: 500 })
      .then(
        () => true,
        () => false,
      );
  }

  async 동작버튼켜짐(): Promise<string | null> {
    return this.driver.$(this.동작버튼).getAttribute('enabled');
  }

  async 동작버튼누르기(): Promise<void> {
    await this.driver.$(this.동작버튼).click();
  }

  async 첫글자(선택자: string): Promise<string> {
    return (await 글자들(this.driver, 선택자))[0] ?? '';
  }

  async 가입날짜글(): Promise<string> {
    await 뜰때까지(this.driver, this.가입날짜);
    return this.첫글자(this.가입날짜);
  }

  async 종버튼(): Promise<요소> {
    await 뜰때까지(this.driver, this.동작줄);
    for (const 버튼 of await this.driver.$(this.동작줄).$$('android.widget.ImageButton')) {
      if (!((await 버튼.getAttribute('resource-id')) ?? '').endsWith('options_btn')) return 버튼;
    }
    throw new Error('알림 종 버튼을 찾지 못했다');
  }

  async 종버튼있나(): Promise<boolean> {
    await 뜰때까지(this.driver, this.동작줄);
    for (const 버튼 of await this.driver.$(this.동작줄).$$('android.widget.ImageButton')) {
      if (!((await 버튼.getAttribute('resource-id')) ?? '').endsWith('options_btn')) return true;
    }
    return false;
  }

  async 메뉴열기(): Promise<void> {
    await this.driver.$(this.옵션버튼).click();
  }

  async 메뉴항목들(): Promise<string[]> {
    await this.메뉴열기();
    return this.메뉴.항목글자();
  }

  async 메뉴고르기(글자: string): Promise<void> {
    await this.메뉴열기();
    await this.메뉴.고르기(글자);
  }

  async 메뉴닫기(): Promise<void> {
    await 뒤로(this.driver);
  }

  async 탭누르기(이름: '타임라인' | '미디어' | '추천'): Promise<void> {
    await this.driver.$(`~${이름}`).click();
  }

  async 필터열기(): Promise<void> {
    await this.driver.$(this.필터버튼).click();
  }

  async 사진누르기(): Promise<void> {
    for (let 번 = 0; 번 < 8 && !(await 보이나(this.driver, this.사진들)); 번++) await 위로밀기(this.driver, 1);
    await this.driver.$(this.사진들).click();
  }

  async 팔로워누르기(): Promise<void> {
    await this.driver.$(this.팔로워수).click();
  }

  async 글자누르기(글자: string): Promise<void> {
    await 글자누르기(this.driver, 글자);
  }

  async 사라졌나(선택자: string): Promise<boolean> {
    return 사라질때까지(this.driver, 선택자);
  }

  async 탭있나(이름: '타임라인' | '미디어' | '추천'): Promise<boolean> {
    return 뜰때까지(this.driver, `~${이름}`);
  }

  async 종버튼누르기(): Promise<void> {
    await (await this.종버튼()).click();
  }

  async 아는팔로워줄누르기(): Promise<void> {
    const 글 = (await 문구가보이나(this.driver, '팔로우했습니다', 3_000)) ? '팔로우했습니다' : '님이 팔로우함';
    await (await 글자가든요소(this.driver, 글)).click();
  }
}
