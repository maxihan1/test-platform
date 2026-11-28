import type { AppDriver } from '@platform/kit/app';
import { 될때까지, 뜰때까지, 보이나, 사라질때까지 } from '@platform/kit/parts';

import { 꾸러미, 모든글자, 앱id } from '../helpers/app.helper.js';

export class 공개범위시트 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/visibility_spinner_wrap';
  static readonly 제목 = 'android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().text("공개 범위 및 상호작용"))';
  static readonly 부제 = 앱id('subtitle');
  static readonly 범위칸 = 앱id('visibility_spinner');
  static readonly 범위값 = `android=new UiSelector().resourceId("${꾸러미}:id/visibility_spinner_wrap").childSelector(new UiSelector().resourceId("android:id/text1"))`;
  static readonly 인용정책칸 = 앱id('quote_policy_spinner');
  static readonly 인용정책값 = `android=new UiSelector().resourceId("${꾸러미}:id/quote_policy_spinner_wrap").childSelector(new UiSelector().resourceId("android:id/text1"))`;
  static readonly 줄제목들 = 앱id('title');
  static readonly 줄설명들 = 앱id('subtitle');
  static readonly 취소 = 앱id('cancel');
  static readonly 저장 = 앱id('save');
  static readonly 시트글들 = 'android=new UiSelector().className("android.widget.TextView")';

  static readonly 정책줄들 = 'id=android:id/text1';

  static 줄(글자: string): string {
    return `android=new UiSelector().resourceId("${꾸러미}:id/title").text(${JSON.stringify(글자)})`;
  }

  static 정책줄(글자: string): string {
    return `android=new UiSelector().resourceId("android:id/text1").text(${JSON.stringify(글자)})`;
  }

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 공개범위시트.제목, 시간);
  }

  async 닫혔나(시간 = 10_000): Promise<boolean> {
    return 사라질때까지(this.driver, 공개범위시트.저장, 시간);
  }

  async 부제글(): Promise<string> {
    return this.driver.$(공개범위시트.부제).getText();
  }

  async 시트글들(): Promise<string[]> {
    return 모든글자(this.driver, 공개범위시트.시트글들);
  }

  async 범위글(): Promise<string> {
    return this.driver.$(공개범위시트.범위값).getText();
  }

  async 인용정책글(): Promise<string> {
    return this.driver.$(공개범위시트.인용정책값).getText();
  }

  async 범위열기(): Promise<void> {
    await this.driver.$(공개범위시트.범위칸).click();
  }

  async 인용정책열기(): Promise<void> {
    await this.driver.$(공개범위시트.인용정책칸).click();
  }

  async 줄글들(): Promise<string[]> {
    const 제목들 = await 모든글자(this.driver, 공개범위시트.줄제목들);
    if (제목들.length > 0) return 제목들;
    return 모든글자(this.driver, 공개범위시트.정책줄들);
  }

  async 줄설명들(): Promise<string[]> {
    return 모든글자(this.driver, 공개범위시트.줄설명들);
  }

  async 줄있나(글자: string, 시간 = 5_000): Promise<boolean> {
    return 될때까지(this.driver, async () => (await 보이나(this.driver, 공개범위시트.줄(글자))) || (await 보이나(this.driver, 공개범위시트.정책줄(글자))), 시간);
  }

  async 줄고르기(글자: string): Promise<void> {
    if (!(await this.줄있나(글자, 10_000))) throw new Error(`공개 범위 시트 줄 「${글자}」이 안 보인다`);
    const 주소 = (await 보이나(this.driver, 공개범위시트.줄(글자))) ? 공개범위시트.줄(글자) : 공개범위시트.정책줄(글자);
    await this.driver.$(주소).click();
  }

  async 줄창떴나(시간 = 5_000): Promise<boolean> {
    return 뜰때까지(this.driver, 공개범위시트.줄제목들, 시간);
  }

  async 줄창닫기(): Promise<void> {
    await this.driver.back();
  }

  async 취소누르기(): Promise<void> {
    await this.driver.$(공개범위시트.취소).click();
  }

  async 저장누르기(): Promise<void> {
    await this.driver.$(공개범위시트.저장).click();
  }

  async 취소저장있나(): Promise<boolean> {
    return (await 뜰때까지(this.driver, 공개범위시트.취소, 5_000)) && (await 뜰때까지(this.driver, 공개범위시트.저장, 5_000));
  }
}
