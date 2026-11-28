import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지 } from '@platform/kit/parts';

import { 꾸러미, 모든글자, 앱id } from '../helpers/app.helper.js';

export class 개인정보화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 제목 = `android=new UiSelector().resourceId("${꾸러미}:id/toolbar").childSelector(new UiSelector().className("android.widget.TextView"))`;
  static readonly 제목표지 = `android=new UiSelector().resourceId("${꾸러미}:id/toolbar").childSelector(new UiSelector().text("당신의 개인정보"))`;
  static readonly 안내글 = 앱id('text');
  static readonly 링크제목들 = `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().resourceId("${꾸러미}:id/title"))`;
  static readonly 링크부제들 = `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().resourceId("${꾸러미}:id/subtitle"))`;
  static readonly 비동의버튼 = 앱id('btn_back');
  static readonly 동의버튼 = 앱id('btn_next');
  static readonly 상위버튼 = '~상위 메뉴로 이동';

  static 링크줄(글자: string): string {
    return `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().resourceId("${꾸러미}:id/title").text(${JSON.stringify(글자)}))`;
  }

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 30_000): Promise<boolean> {
    return 뜰때까지(this.driver, 개인정보화면.제목표지, 시간);
  }

  async 제목글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 개인정보화면.제목, 10_000))) return '';
    return this.driver.$(개인정보화면.제목).getText();
  }

  async 안내글읽기(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 개인정보화면.안내글, 10_000))) return '';
    return this.driver.$(개인정보화면.안내글).getText();
  }

  async 링크제목읽기(): Promise<string[]> {
    return 모든글자(this.driver, 개인정보화면.링크제목들);
  }

  async 링크부제읽기(): Promise<string[]> {
    return 모든글자(this.driver, 개인정보화면.링크부제들);
  }

  async 링크있나(글자: string, 시간 = 3_000): Promise<boolean> {
    return 뜰때까지(this.driver, 개인정보화면.링크줄(글자), 시간);
  }

  async 링크누르기(글자: string): Promise<void> {
    if (!(await this.링크있나(글자, 10_000))) throw new Error(`개인정보 화면 링크 「${글자}」가 안 보인다`);
    await this.driver.$(개인정보화면.링크줄(글자)).click();
  }

  async 비동의버튼글(): Promise<string> {
    return this.driver.$(개인정보화면.비동의버튼).getText();
  }

  async 동의버튼글(): Promise<string> {
    return this.driver.$(개인정보화면.동의버튼).getText();
  }

  async 동의누르기(): Promise<void> {
    if (!(await 뜰때까지(this.driver, 개인정보화면.동의버튼, 10_000))) throw new Error('개인정보 「동의합니다」가 안 보인다');
    await this.driver.$(개인정보화면.동의버튼).click();
  }

  async 비동의누르기(): Promise<void> {
    if (!(await 뜰때까지(this.driver, 개인정보화면.비동의버튼, 10_000))) throw new Error('개인정보 「비동의」가 안 보인다');
    await this.driver.$(개인정보화면.비동의버튼).click();
  }

  async 상위누르기(): Promise<void> {
    await this.driver.$(개인정보화면.상위버튼).click();
  }
}
