import type { AppDriver } from '@platform/kit/app';

import { 토스트글읽기 } from '../helpers/app.helper.js';

export class 스낵바 {
  static readonly 상자 = '//android.widget.Toast';

  constructor(private readonly driver: AppDriver) {}

  async 글읽기(시간 = 8_000): Promise<string> {
    return 토스트글읽기(this.driver, 시간);
  }
}
