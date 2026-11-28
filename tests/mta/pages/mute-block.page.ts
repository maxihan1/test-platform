import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지, 사라질때까지 } from '@platform/kit/parts';

import { 꾸러미, 모든글자, 목록안글자포함, 앱id } from '../helpers/app.helper.js';

export class 뮤트차단시트 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/content_wrap';
  static readonly 제목 = 앱id('title');
  static readonly 대상 = 앱id('text');
  static readonly 설명들 = `android=new UiSelector().resourceId("${꾸러미}:id/content_wrap").childSelector(new UiSelector().className("android.widget.TextView"))`;
  static readonly 확인버튼 = 앱id('btn_confirm');
  static readonly 취소버튼 = 앱id('btn_cancel');

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 뮤트차단시트.확인버튼, 시간);
  }

  async 닫혔나(시간 = 10_000): Promise<boolean> {
    return 사라질때까지(this.driver, 뮤트차단시트.확인버튼, 시간);
  }

  async 제목글(): Promise<string> {
    if (!(await this.떴나())) return '';
    return this.driver.$(뮤트차단시트.제목).getText();
  }

  async 대상글(): Promise<string> {
    if (!(await this.떴나())) return '';
    return this.driver.$(뮤트차단시트.대상).getText();
  }

  async 설명글들(): Promise<string[]> {
    return 모든글자(this.driver, 뮤트차단시트.설명들);
  }

  async 설명있나(글자: string, 시간 = 3_000): Promise<boolean> {
    return 뜰때까지(this.driver, 목록안글자포함(글자, 'content_wrap'), 시간);
  }

  async 확인버튼글(): Promise<string> {
    return this.driver.$(뮤트차단시트.확인버튼).getText();
  }

  async 취소버튼글(): Promise<string> {
    return this.driver.$(뮤트차단시트.취소버튼).getText();
  }

  async 확인누르기(): Promise<void> {
    if (!(await this.떴나())) throw new Error('뮤트 · 차단 시트가 안 떴다');
    await this.driver.$(뮤트차단시트.확인버튼).click();
  }

  async 취소누르기(): Promise<void> {
    if (!(await this.떴나())) throw new Error('뮤트 · 차단 시트가 안 떴다');
    await this.driver.$(뮤트차단시트.취소버튼).click();
  }
}
