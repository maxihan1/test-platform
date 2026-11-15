import type { AppDriver } from '@platform/kit/app';

import { 글자나설명이뜰때까지 } from '../helpers/timeline.helper.js';

export class 수정내역화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  constructor(private readonly driver: AppDriver) {}

  async 글자가뜰때까지(글자: string, 시간 = 15_000): Promise<boolean> {
    return 글자나설명이뜰때까지(this.driver, 글자, 시간);
  }
}
