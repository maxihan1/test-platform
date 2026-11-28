import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지, 사라질때까지 } from '@platform/kit/parts';

import { 모든글자, 앱id } from '../helpers/app.helper.js';
import { 펼친메뉴 } from './popup-menu.component.js';

export class 부스트시트 {
  static readonly 손잡이 = 앱id('handle');
  static readonly 항목들 = 앱id('title');
  static readonly 시트전체글 = 'android=new UiSelector().className("android.widget.TextView")';
  static readonly 공유시트 = 'id=android:id/chooser_header';

  static 항목(글자: string): string {
    return `android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/title").text(${JSON.stringify(글자)}))`;
  }

  readonly 길게메뉴: 펼친메뉴;

  constructor(private readonly driver: AppDriver) {
    this.길게메뉴 = new 펼친메뉴(driver);
  }

  async 떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 부스트시트.손잡이, 시간);
  }

  async 항목글들(): Promise<string[]> {
    return 모든글자(this.driver, 부스트시트.항목들);
  }

  async 시트글들(): Promise<string[]> {
    return 모든글자(this.driver, 부스트시트.시트전체글);
  }

  async 항목있나(글자: string, 시간 = 3_000): Promise<boolean> {
    return 뜰때까지(this.driver, 부스트시트.항목(글자), 시간);
  }

  async 항목누르기(글자: string): Promise<void> {
    if (!(await this.항목있나(글자, 10_000))) throw new Error(`부스트 시트 항목 「${글자}」이 안 보인다`);
    await this.driver.$(부스트시트.항목(글자)).click();
  }

  async 항목켜졌나(글자: string): Promise<boolean> {
    return (await this.driver.$(부스트시트.항목(글자)).getAttribute('enabled')) === 'true';
  }

  async 닫기(): Promise<void> {
    await this.driver.back();
  }

  async 닫힐때까지(시간 = 10_000): Promise<boolean> {
    return 사라질때까지(this.driver, 부스트시트.손잡이, 시간);
  }

  async 길게메뉴글들(): Promise<string[]> {
    if (!(await this.길게메뉴.떴나())) return [];
    return this.길게메뉴.항목글들();
  }

  async 공유시트떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 부스트시트.공유시트, 시간);
  }

  async 공유시트닫기(): Promise<void> {
    await this.driver.back();
  }
}
