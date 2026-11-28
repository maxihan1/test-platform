import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지 } from '@platform/kit/parts';

import { 꾸러미, 모든글자 } from '../helpers/app.helper.js';

export class 알림제외조건창 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/title';
  static readonly 창제목 = `android=new UiSelector().resourceId("android:id/topPanel").childSelector(new UiSelector().resourceId("${꾸러미}:id/title"))`;
  static readonly 항목제목들 = `android=new UiSelector().resourceId("android:id/custom").childSelector(new UiSelector().resourceId("${꾸러미}:id/title"))`;
  static readonly 항목부제들 = `android=new UiSelector().resourceId("android:id/custom").childSelector(new UiSelector().resourceId("${꾸러미}:id/subtitle"))`;
  static readonly 저장버튼 = 'id=android:id/button1';

  static 항목(제목: string): string {
    return `android=new UiSelector().resourceId("android:id/custom").childSelector(new UiSelector().resourceId("${꾸러미}:id/title").text(${JSON.stringify(제목)}))`;
  }

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 알림제외조건창.저장버튼, 시간);
  }

  async 창제목글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 알림제외조건창.창제목, 5_000))) return '';
    return this.driver.$(알림제외조건창.창제목).getText();
  }

  async 항목제목읽기(): Promise<string[]> {
    return 모든글자(this.driver, 알림제외조건창.항목제목들);
  }

  async 항목부제읽기(): Promise<string[]> {
    return 모든글자(this.driver, 알림제외조건창.항목부제들);
  }

  async 항목있나(제목: string, 시간 = 3_000): Promise<boolean> {
    return 뜰때까지(this.driver, 알림제외조건창.항목(제목), 시간);
  }

  async 항목누르기(제목: string): Promise<void> {
    if (!(await this.항목있나(제목, 10_000))) throw new Error(`알림 제외 조건 항목 「${제목}」이 안 보인다`);
    await this.driver.$(알림제외조건창.항목(제목)).click();
  }

  async 저장글(): Promise<string> {
    return this.driver.$(알림제외조건창.저장버튼).getText();
  }

  async 저장누르기(): Promise<void> {
    if (!(await 뜰때까지(this.driver, 알림제외조건창.저장버튼, 10_000))) throw new Error('알림 제외 조건 「저장」이 안 보인다');
    await this.driver.$(알림제외조건창.저장버튼).click();
  }

  async 닫기(): Promise<void> {
    await this.driver.back();
  }
}
