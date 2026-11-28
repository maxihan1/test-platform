import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지 } from '@platform/kit/parts';

import { 위로이동, 줄스위치누르기, 줄스위치켜졌나, 줄있나, 툴바글자 } from '../helpers/system-ui.helper.js';

export class 프라이버시설정화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 제목 = 툴바글자('프라이버시와 노출 범위');

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 프라이버시설정화면.제목, 시간);
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

  async 위로누르기(): Promise<void> {
    await this.driver.$(위로이동).click();
  }
}
