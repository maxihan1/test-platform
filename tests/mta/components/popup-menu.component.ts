import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지, 사라질때까지 } from '@platform/kit/parts';

import { 모든글자, 모든요소 } from '../helpers/app.helper.js';
export class 펼친메뉴 {
  static readonly 항목들 = 'id=android:id/title';

  static 일부항목(일부: string): string {
    return `android=new UiSelector().resourceId("android:id/title").textContains(${JSON.stringify(일부)})`;
  }

  static 항목(글자: string): string {
    return `android=new UiSelector().resourceId("android:id/title").text(${JSON.stringify(글자)})`;
  }

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 펼친메뉴.항목들, 시간);
  }

  async 항목글들(): Promise<string[]> {
    return 모든글자(this.driver, 펼친메뉴.항목들);
  }

  async 항목있나(글자: string, 시간 = 3_000): Promise<boolean> {
    return 뜰때까지(this.driver, 펼친메뉴.항목(글자), 시간);
  }

  async 항목누르기(글자: string): Promise<void> {
    if (!(await this.항목있나(글자, 10_000))) throw new Error(`메뉴 항목 「${글자}」이 안 보인다`);
    await this.driver.$(펼친메뉴.항목(글자)).click();
  }

  async 닫기(): Promise<void> {
    await this.driver.back();
  }

  async 항목수(): Promise<number> {
    return (await 모든요소(this.driver, 펼친메뉴.항목들)).length;
  }

  async 일부항목있나(일부: string, 시간 = 3_000): Promise<boolean> {
    return 뜰때까지(this.driver, 펼친메뉴.일부항목(일부), 시간);
  }

  async 일부항목글(일부: string): Promise<string> {
    if (!(await this.일부항목있나(일부, 5_000))) return '';
    return this.driver.$(펼친메뉴.일부항목(일부)).getText();
  }

  async 일부항목누르기(일부: string): Promise<void> {
    if (!(await this.일부항목있나(일부, 10_000))) throw new Error(`메뉴 항목에 「${일부}」가 든 것이 안 보인다`);
    await this.driver.$(펼친메뉴.일부항목(일부)).click();
  }

  async 사라질때까지(시간 = 10_000): Promise<boolean> {
    return 사라질때까지(this.driver, 펼친메뉴.항목들, 시간);
  }
}
