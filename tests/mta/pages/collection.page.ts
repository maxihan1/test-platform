import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지 } from '@platform/kit/parts';

import { 뜨는메뉴 } from '../components/popup-menu.component.js';
import { 글자나설명이뜰때까지, 글자나설명이보이나, 화면글자포함 } from '../helpers/timeline.helper.js';

export class 컬렉션화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 메뉴: 뜨는메뉴;
  readonly 옵션더보기 = '~옵션 더보기';

  constructor(private readonly driver: AppDriver) {
    this.메뉴 = new 뜨는메뉴(driver);
  }

  async 글자가뜰때까지(글자: string, 시간 = 10_000): Promise<boolean> {
    return 글자나설명이뜰때까지(this.driver, 글자, 시간);
  }

  async 글자가보이나(글자: string): Promise<boolean> {
    return 글자나설명이보이나(this.driver, 글자);
  }

  async 열기(제목: string): Promise<void> {
    await 뜰때까지(this.driver, 화면글자포함(제목), 15_000);
    await this.driver.$(화면글자포함(제목)).click();
  }

  async 메뉴열기(): Promise<void> {
    await 뜰때까지(this.driver, this.옵션더보기, 15_000);
    await this.driver.$(this.옵션더보기).click();
  }
}
