import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지 } from '@platform/kit/parts';

import { 꾸러미 } from '../helpers/app.helper.js';
import {
  고르기창글들,
  고르기창줄누르기,
  고르기창떴나,
  위로이동,
  줄누르기,
  줄부제,
  줄스위치누르기,
  줄스위치켜졌나,
  줄있나,
  툴바글자,
} from '../helpers/system-ui.helper.js';

export class 알림설정화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 제목 = 툴바글자('알림');
  static readonly 일시중지줄 = '모두 일시 중지';
  static readonly 알림받기줄 = '알림 받기';

  static 창제목(글자: string): string {
    return `android=new UiSelector().resourceId("${꾸러미}:id/title").text(${JSON.stringify(글자)})`;
  }

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 알림설정화면.제목, 시간);
  }

  async 줄있나(글자: string, 시간 = 3_000): Promise<boolean> {
    return 줄있나(this.driver, 글자, 시간);
  }

  async 일시중지부제(): Promise<string> {
    return 줄부제(this.driver, 알림설정화면.일시중지줄);
  }

  async 일시중지켜졌나(): Promise<boolean> {
    return 줄스위치켜졌나(this.driver, 알림설정화면.일시중지줄);
  }

  async 일시중지스위치누르기(): Promise<void> {
    await 줄스위치누르기(this.driver, 알림설정화면.일시중지줄);
  }

  async 일시중지창떴나(제목: string, 시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 알림설정화면.창제목(제목), 시간);
  }

  async 일시중지창선택지(): Promise<string[]> {
    return 고르기창글들(this.driver);
  }

  async 일시중지고르기(글자: string): Promise<void> {
    await 고르기창줄누르기(this.driver, 글자);
  }

  async 알림받기부제(): Promise<string> {
    return 줄부제(this.driver, 알림설정화면.알림받기줄);
  }

  async 알림받기누르기(): Promise<void> {
    await 줄누르기(this.driver, 알림설정화면.알림받기줄);
  }

  async 알림받기창떴나(시간 = 10_000): Promise<boolean> {
    return 고르기창떴나(this.driver, 시간);
  }

  async 알림받기선택지(): Promise<string[]> {
    return 고르기창글들(this.driver);
  }

  async 종류줄있나(글자: string, 시간 = 3_000): Promise<boolean> {
    return 줄있나(this.driver, 글자, 시간);
  }

  async 종류줄누르기(글자: string): Promise<void> {
    await 줄누르기(this.driver, 글자);
  }

  async 위로누르기(): Promise<void> {
    await this.driver.$(위로이동).click();
  }
}
