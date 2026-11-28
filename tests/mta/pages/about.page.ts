import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지 } from '@platform/kit/parts';

import { 꾸러미 } from '../helpers/app.helper.js';
import { 위로이동, 줄누르기, 줄부제, 줄있나, 토스트에글자있나, 토스트읽기, 툴바글자 } from '../helpers/system-ui.helper.js';

export class 앱정보화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 제목 = 툴바글자('Mastodon에 대해');
  static readonly 캐시줄 = '미디어 캐시 지우기';
  static readonly 버전줄 = `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().textStartsWith("안드로이드용 마스토돈"))`;

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 앱정보화면.제목, 시간);
  }

  async 줄있나(글자: string, 시간 = 3_000): Promise<boolean> {
    return 줄있나(this.driver, 글자, 시간);
  }

  async 줄누르기(글자: string): Promise<void> {
    await 줄누르기(this.driver, 글자);
  }

  async 캐시부제(): Promise<string> {
    return 줄부제(this.driver, 앱정보화면.캐시줄);
  }

  async 캐시지우기누르기(): Promise<void> {
    await 줄누르기(this.driver, 앱정보화면.캐시줄);
  }

  async 버전줄있나(시간 = 5_000): Promise<boolean> {
    return 뜰때까지(this.driver, 앱정보화면.버전줄, 시간);
  }

  async 버전줄글(): Promise<string> {
    if (!(await this.버전줄있나(10_000))) return '';
    return this.driver.$(앱정보화면.버전줄).getText();
  }

  async 버전줄누르기(): Promise<void> {
    if (!(await this.버전줄있나(10_000))) throw new Error('맨 아래 버전 줄이 안 보인다');
    await this.driver.$(앱정보화면.버전줄).click();
  }

  async 토스트글(): Promise<string> {
    return 토스트읽기(this.driver);
  }

  async 토스트에글자있나(글자: string, 시간 = 8_000): Promise<boolean> {
    return 토스트에글자있나(this.driver, 글자, 시간);
  }

  async 위로누르기(): Promise<void> {
    await this.driver.$(위로이동).click();
  }
}
