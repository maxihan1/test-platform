import type { AppDriver } from '@platform/kit/app';
import { 될때까지, 뜰때까지 } from '@platform/kit/parts';

import { 토스트에글자있나 } from '../helpers/system-ui.helper.js';

export class 이메일확인화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 재전송 = 'android=new UiSelector().className("android.widget.Button").textStartsWith("재전송")';

  static 글(글자: string): string {
    return `android=new UiSelector().className("android.widget.TextView").text(${JSON.stringify(글자)})`;
  }

  static 글포함(글자: string): string {
    return `android=new UiSelector().className("android.widget.TextView").textContains(${JSON.stringify(글자)})`;
  }

  constructor(private readonly driver: AppDriver) {}

  async 제목있나(제목: string, 시간 = 60_000): Promise<boolean> {
    return 뜰때까지(this.driver, 이메일확인화면.글(제목), 시간);
  }

  async 안내글(포함: string): Promise<string> {
    if (!(await 뜰때까지(this.driver, 이메일확인화면.글포함(포함), 10_000))) return '';
    return this.driver.$(이메일확인화면.글포함(포함)).getText();
  }

  async 재전송누르기(): Promise<void> {
    if (!(await 뜰때까지(this.driver, 이메일확인화면.재전송, 10_000))) throw new Error('「재전송」 버튼이 안 보인다');
    await this.driver.$(이메일확인화면.재전송).click();
  }

  async 재전송글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 이메일확인화면.재전송, 10_000))) return '';
    return this.driver.$(이메일확인화면.재전송).getText();
  }

  async 재전송켜졌나(): Promise<boolean> {
    return this.driver.$(이메일확인화면.재전송).isEnabled();
  }

  async 재전송켜질때까지(시간: number): Promise<boolean> {
    return 될때까지(this.driver, () => this.재전송켜졌나(), 시간);
  }

  async 토스트에글자있나(글자: string, 시간 = 8_000): Promise<boolean> {
    return 토스트에글자있나(this.driver, 글자, 시간);
  }
}
