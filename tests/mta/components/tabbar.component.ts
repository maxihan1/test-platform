import type { AppDriver } from '@platform/kit/app';
import { 길게누르기, 뜰때까지 } from '@platform/kit/parts';

import { 앱id } from '../helpers/app.helper.js';

export class 하단탭 {
  static readonly 홈 = 앱id('tab_home');
  static readonly 둘러보기 = 앱id('tab_search');
  static readonly 알림 = 앱id('tab_notifications');
  static readonly 프로필 = 앱id('tab_profile');
  static readonly 프로필아바타 = 앱id('tab_profile_ava');
  static readonly 알림배지 = 앱id('notifications_badge');

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 하단탭.홈, 시간);
  }

  async 누르기(탭: '홈' | '둘러보기' | '알림' | '프로필'): Promise<void> {
    const 주소 = { 홈: 하단탭.홈, 둘러보기: 하단탭.둘러보기, 알림: 하단탭.알림, 프로필: 하단탭.프로필 }[탭];
    if (!(await 뜰때까지(this.driver, 주소, 10_000))) throw new Error(`하단 「${탭}」 탭이 안 보인다`);
    await this.driver.$(주소).click();
  }

  async 프로필길게누르기(): Promise<void> {
    await 길게누르기(this.driver, 하단탭.프로필);
  }

  async 탭설명(탭: '홈' | '둘러보기' | '알림' | '프로필'): Promise<string> {
    const 주소 = { 홈: 하단탭.홈, 둘러보기: 하단탭.둘러보기, 알림: 하단탭.알림, 프로필: 하단탭.프로필 }[탭];
    return (await this.driver.$(주소).getAttribute('content-desc')) ?? '';
  }

  async 선택됐나(탭: '홈' | '둘러보기' | '알림' | '프로필'): Promise<boolean> {
    const 주소 = { 홈: 하단탭.홈, 둘러보기: 하단탭.둘러보기, 알림: 하단탭.알림, 프로필: 하단탭.프로필 }[탭];
    return (await this.driver.$(주소).getAttribute('selected')) === 'true';
  }
}
