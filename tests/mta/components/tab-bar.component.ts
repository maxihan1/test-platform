import type { AppDriver } from '@platform/kit/app';

export class 하단탭 {
  readonly 홈 = 'id=org.joinmastodon.android:id/tab_home';
  readonly 둘러보기 = 'id=org.joinmastodon.android:id/tab_search';
  readonly 알림 = 'id=org.joinmastodon.android:id/tab_notifications';
  readonly 프로필 = 'id=org.joinmastodon.android:id/tab_profile';
  readonly 프로필아바타 = 'id=org.joinmastodon.android:id/tab_profile_ava';
  readonly 탭글자들 = 'id=org.joinmastodon.android:id/label';

  constructor(private readonly driver: AppDriver) {}

  탭글자(글자: string): string {
    return `android=new UiSelector().resourceId("org.joinmastodon.android:id/tabbar").childSelector(new UiSelector().text(${JSON.stringify(글자)}))`;
  }

  async 누르기(탭: '홈' | '둘러보기' | '알림' | '프로필'): Promise<void> {
    await this.driver.$(this[탭]).click();
  }
}
