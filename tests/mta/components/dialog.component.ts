import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지, 사라질때까지 } from '@platform/kit/parts';

export class 확인창 {
  static readonly 제목 = 'android=new UiSelector().resourceId("android:id/topPanel").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/title"))';
  static readonly 세번째버튼 = 'id=android:id/button3';
  static readonly 글 = 'id=android:id/message';
  static readonly 확인버튼 = 'id=android:id/button1';
  static readonly 취소버튼 = 'id=android:id/button2';

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 확인창.확인버튼, 시간);
  }

  async 글읽기(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 확인창.글, 5_000))) return '';
    return this.driver.$(확인창.글).getText();
  }

  async 확인버튼글(): Promise<string> {
    return this.driver.$(확인창.확인버튼).getText();
  }

  async 취소버튼글(): Promise<string> {
    return this.driver.$(확인창.취소버튼).getText();
  }

  async 확인누르기(): Promise<void> {
    await this.driver.$(확인창.확인버튼).click();
  }

  async 취소누르기(): Promise<void> {
    await this.driver.$(확인창.취소버튼).click();
  }

  async 제목글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 확인창.제목, 5_000))) return '';
    return this.driver.$(확인창.제목).getText();
  }

  async 세번째버튼있나(시간 = 3_000): Promise<boolean> {
    return 뜰때까지(this.driver, 확인창.세번째버튼, 시간);
  }

  async 세번째버튼글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 확인창.세번째버튼, 5_000))) return '';
    return this.driver.$(확인창.세번째버튼).getText();
  }

  async 세번째누르기(): Promise<void> {
    await this.driver.$(확인창.세번째버튼).click();
  }

  async 사라질때까지(시간 = 10_000): Promise<boolean> {
    return 사라질때까지(this.driver, 확인창.확인버튼, 시간);
  }
}
