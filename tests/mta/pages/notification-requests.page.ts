import { 글자로고르기, 보이나, 앱id, 뜰때까지, type 앱 } from '../helpers/app.helper.js';

export class 필터링된알림화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 아바타들 = 앱id('ava');
  readonly 이름들 = 앱id('name');
  readonly 개수배지들 = 앱id('badge');
  readonly 계정들 = 앱id('username');
  readonly 허용 = '~알림 허용';
  readonly 해제 = '~알림 요청 해제';
  readonly 허용버튼 = 앱id('btn_allow');
  readonly 제목들 = 앱id('title');

  constructor(private readonly driver: 앱) {}

  async 열기(): Promise<boolean> {
    await (await 글자로고르기(this.driver, this.제목들, '필터링된 알림')).click();
    return 뜰때까지(this.driver, this.허용버튼, 15_000);
  }

  async 보이나(선택자: string): Promise<boolean> {
    return 보이나(this.driver, 선택자);
  }

  async 첫행누르기(): Promise<void> {
    await this.driver.$(this.이름들).click();
  }

  async 허용누르기(): Promise<void> {
    await this.driver.$(this.허용).click();
  }

  async 해제누르기(): Promise<void> {
    await this.driver.$(this.해제).click();
  }

  async 메뉴펼치기(): Promise<void> {
    const 더보기 = await this.driver.$('~옵션 더보기');
    if (await 더보기.isExisting()) await 더보기.click();
  }
}
