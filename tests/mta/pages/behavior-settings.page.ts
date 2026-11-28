import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지 } from '@platform/kit/parts';

import { 고르기창글들, 고르기창줄누르기, 고르기창떴나, 위로이동, 줄누르기, 줄부제, 줄스위치누르기, 줄스위치켜졌나, 줄있나, 툴바글자 } from '../helpers/system-ui.helper.js';

export class 동작설정화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 제목 = 툴바글자('동작');
  static readonly 링크열기줄 = '링크 열기';

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 동작설정화면.제목, 시간);
  }

  async 줄있나(글자: string, 시간 = 3_000): Promise<boolean> {
    return 줄있나(this.driver, 글자, 시간);
  }

  async 스위치켜졌나(글자: string): Promise<boolean> {
    return 줄스위치켜졌나(this.driver, 글자);
  }

  async 스위치누르기(글자: string): Promise<void> {
    await 줄스위치누르기(this.driver, 글자);
  }

  async 링크열기글(): Promise<string> {
    return 줄부제(this.driver, 동작설정화면.링크열기줄);
  }

  async 링크열기누르기(): Promise<void> {
    await 줄누르기(this.driver, 동작설정화면.링크열기줄);
  }

  async 링크열기창떴나(시간 = 10_000): Promise<boolean> {
    return 고르기창떴나(this.driver, 시간);
  }

  async 링크열기선택지(): Promise<string[]> {
    return 고르기창글들(this.driver);
  }

  async 링크열기고르기(글자: string): Promise<void> {
    await 고르기창줄누르기(this.driver, 글자);
  }

  async 위로누르기(): Promise<void> {
    await this.driver.$(위로이동).click();
  }
}
