import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지 } from '@platform/kit/parts';

import { 위로이동, 줄누르기, 줄있나, 줄제목들, 줄부제, 설정줄글자시작 } from '../helpers/system-ui.helper.js';

export class 설정화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 제목 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/toolbar").childSelector(new UiSelector().text("설정"))';
  static readonly 위로 = 위로이동;
  static readonly 계정추가줄 = 설정줄글자시작('계정 추가');

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 설정화면.제목, 시간);
  }

  async 줄있나(글자: string, 시간 = 3_000): Promise<boolean> {
    return 줄있나(this.driver, 글자, 시간);
  }

  async 줄제목들(): Promise<string[]> {
    return 줄제목들(this.driver);
  }

  async 줄누르기(글자: string): Promise<void> {
    await 줄누르기(this.driver, 글자);
  }

  async 줄부제(글자: string): Promise<string> {
    return 줄부제(this.driver, 글자);
  }

  async 계정줄있나(계정: string, 시간 = 5_000): Promise<boolean> {
    return 줄있나(this.driver, 계정, 시간);
  }

  async 계정줄누르기(계정: string): Promise<void> {
    await 줄누르기(this.driver, 계정);
  }

  async 계정추가줄있나(시간 = 5_000): Promise<boolean> {
    return 뜰때까지(this.driver, 설정화면.계정추가줄, 시간);
  }

  async 계정추가누르기(): Promise<void> {
    if (!(await this.계정추가줄있나(10_000))) throw new Error('설정 「계정 추가」 줄이 안 보인다');
    await this.driver.$(설정화면.계정추가줄).click();
  }

  async 동작누르기(): Promise<void> {
    await 줄누르기(this.driver, '동작');
  }

  async 디스플레이누르기(): Promise<void> {
    await 줄누르기(this.driver, '디스플레이');
  }

  async 앱정보누르기(): Promise<void> {
    await 줄누르기(this.driver, 'Mastodon에 대해');
  }

  async 위로누르기(): Promise<void> {
    await this.driver.$(설정화면.위로).click();
  }
}
