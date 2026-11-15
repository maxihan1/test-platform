import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지 } from '@platform/kit/parts';

import { 뜨는메뉴 } from '../components/popup-menu.component.js';

export class 공개범위시트 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 메뉴: 뜨는메뉴;
  readonly 설명 = 'id=org.joinmastodon.android:id/subtitle';
  readonly 공개스피너 = 'id=org.joinmastodon.android:id/visibility_spinner';
  readonly 공개스피너글 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/visibility_spinner").childSelector(new UiSelector().className("android.widget.TextView"))';
  readonly 인용스피너 = 'id=org.joinmastodon.android:id/quote_policy_spinner';
  readonly 인용스피너글 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/quote_policy_spinner").childSelector(new UiSelector().className("android.widget.TextView"))';
  readonly 취소 = 'id=org.joinmastodon.android:id/cancel';
  readonly 저장 = 'id=org.joinmastodon.android:id/save';

  constructor(private readonly driver: AppDriver) {
    this.메뉴 = new 뜨는메뉴(driver);
  }

  async 그려질때까지(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.저장, 시간);
  }

  async 설명글(): Promise<string> {
    return this.driver.$(this.설명).getText();
  }

  async 공개열기(): Promise<void> {
    await this.driver.$(this.공개스피너).click();
  }

  async 공개고르기(글자: string): Promise<void> {
    await this.공개열기();
    await this.메뉴.고르기(글자);
  }

  async 인용열기(): Promise<void> {
    await this.driver.$(this.인용스피너).click();
  }

  async 인용고르기(글자: string): Promise<void> {
    await this.인용열기();
    await this.메뉴.고르기(글자);
  }

  async 공개글(): Promise<string> {
    return this.driver.$(this.공개스피너글).getText();
  }

  async 인용글(): Promise<string> {
    return this.driver.$(this.인용스피너글).getText();
  }

  async 저장하기(): Promise<void> {
    await this.driver.$(this.저장).click();
  }

  async 취소하기(): Promise<void> {
    await this.driver.$(this.취소).click();
  }
}
