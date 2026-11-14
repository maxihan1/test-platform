import { 앱id, type 앱 } from '../helpers/app.helper.js';

export class 하단탭 {
  readonly 홈 = 앱id('tab_home');
  readonly 둘러보기 = 앱id('tab_search');
  readonly 알림 = 앱id('tab_notifications');
  readonly 프로필 = 앱id('tab_profile');
  readonly 프로필아바타 = 앱id('tab_profile_ava');
  readonly 이름표 = 앱id('label');
  readonly 알림배지 = 앱id('tab_badge');

  constructor(private readonly driver: 앱) {}

  async 누르기(탭: '홈' | '둘러보기' | '알림' | '프로필'): Promise<void> {
    await this.driver.$(this[탭]).click();
  }
}
