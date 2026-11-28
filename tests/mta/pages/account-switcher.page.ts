import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지, 사라질때까지 } from '@platform/kit/parts';

import { 꾸러미, 모든글자, 앱id } from '../helpers/app.helper.js';

export class 계정전환시트 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 계정추가 = 'android=new UiSelector().className("android.widget.TextView").text("계정 추가")';
  static readonly 모두로그아웃 = 'android=new UiSelector().className("android.widget.TextView").text("모든 계정 로그아웃하기")';
  static readonly 아바타들 = 앱id('avatar');
  static readonly 이름들 = 앱id('name');
  static readonly 계정줄들 = 앱id('username');
  static readonly 고름표들 = 앱id('radiobtn');

  static 계정줄(계정글: string): string {
    return `android=new UiSelector().resourceId("${꾸러미}:id/username").text(${JSON.stringify(계정글)})`;
  }

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 계정전환시트.계정추가, 시간);
  }

  async 닫기(): Promise<void> {
    await this.driver.back();
  }

  async 닫힐때까지(시간 = 10_000): Promise<boolean> {
    return 사라질때까지(this.driver, 계정전환시트.계정추가, 시간);
  }

  async 계정줄글들(): Promise<string[]> {
    return 모든글자(this.driver, 계정전환시트.계정줄들);
  }

  async 이름글들(): Promise<string[]> {
    return 모든글자(this.driver, 계정전환시트.이름들);
  }

  async 계정줄있나(계정글: string, 시간 = 5_000): Promise<boolean> {
    return 뜰때까지(this.driver, 계정전환시트.계정줄(계정글), 시간);
  }

  async 아바타있나(시간 = 5_000): Promise<boolean> {
    return 뜰때까지(this.driver, 계정전환시트.아바타들, 시간);
  }

  async 계정줄누르기(계정글: string): Promise<void> {
    if (!(await this.계정줄있나(계정글, 10_000))) throw new Error(`계정 전환 시트에 「${계정글}」 줄이 안 보인다`);
    await this.driver.$(계정전환시트.계정줄(계정글)).click();
  }

  async 계정추가글(): Promise<string> {
    return this.driver.$(계정전환시트.계정추가).getText();
  }

  async 계정추가누르기(): Promise<void> {
    if (!(await 뜰때까지(this.driver, 계정전환시트.계정추가, 10_000))) throw new Error('계정 전환 시트 「계정 추가」가 안 보인다');
    await this.driver.$(계정전환시트.계정추가).click();
  }

  async 모두로그아웃글(): Promise<string> {
    return this.driver.$(계정전환시트.모두로그아웃).getText();
  }

  async 모두로그아웃누르기(): Promise<void> {
    if (!(await 뜰때까지(this.driver, 계정전환시트.모두로그아웃, 10_000))) throw new Error('계정 전환 시트 「모든 계정 로그아웃하기」가 안 보인다');
    await this.driver.$(계정전환시트.모두로그아웃).click();
  }
}
