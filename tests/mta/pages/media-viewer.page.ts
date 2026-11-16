import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지 } from '@platform/kit/parts';

import { 글자나설명누르기, 글자나설명이뜰때까지 } from '../helpers/timeline.helper.js';

export class 미디어뷰어 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 재생버튼 = 'id=org.joinmastodon.android:id/play_pause_btn';
  readonly 진행막대 = 'id=org.joinmastodon.android:id/seekbar';
  readonly 뒤로 = 'id=org.joinmastodon.android:id/btn_back';

  constructor(private readonly driver: AppDriver) {}

  async 글자가뜰때까지(글자: string, 시간 = 10_000): Promise<boolean> {
    return 글자나설명이뜰때까지(this.driver, 글자, 시간);
  }

  async 누르기(글자: string): Promise<void> {
    await 글자나설명누르기(this.driver, 글자);
  }

  async 영상뷰어가뜰때까지(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.재생버튼, 시간);
  }

  async 재생버튼이름(): Promise<string> {
    return (await this.driver.$(this.재생버튼).getAttribute('content-desc')) ?? '';
  }

  async 닫기(): Promise<void> {
    await this.driver.$(this.뒤로).click();
  }
}
