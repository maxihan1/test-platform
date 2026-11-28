import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지 } from '@platform/kit/parts';

import { 꾸러미, 모든글자, 앱id } from '../helpers/app.helper.js';

export class 규칙화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 제목 = `android=new UiSelector().resourceId("${꾸러미}:id/toolbar").childSelector(new UiSelector().className("android.widget.TextView"))`;
  static readonly 제목표지 = `android=new UiSelector().resourceId("${꾸러미}:id/toolbar").childSelector(new UiSelector().text("서버 규칙"))`;
  static readonly 안내글 = 앱id('text');
  static readonly 목록글들 = `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().className("android.widget.TextView"))`;
  static readonly 동의안함버튼 = 앱id('btn_back');
  static readonly 동의버튼 = 앱id('btn_next');
  static readonly 상위버튼 = '~상위 메뉴로 이동';

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 30_000): Promise<boolean> {
    return 뜰때까지(this.driver, 규칙화면.제목표지, 시간);
  }

  async 제목글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 규칙화면.제목, 10_000))) return '';
    return this.driver.$(규칙화면.제목).getText();
  }

  async 안내글읽기(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 규칙화면.안내글, 10_000))) return '';
    return this.driver.$(규칙화면.안내글).getText();
  }

  async 목록글읽기(): Promise<string[]> {
    return 모든글자(this.driver, 규칙화면.목록글들);
  }

  async 동의버튼글(): Promise<string> {
    return this.driver.$(규칙화면.동의버튼).getText();
  }

  async 동의안함버튼글(): Promise<string> {
    return this.driver.$(규칙화면.동의안함버튼).getText();
  }

  async 동의누르기(): Promise<void> {
    if (!(await 뜰때까지(this.driver, 규칙화면.동의버튼, 10_000))) throw new Error('서버 규칙 「동의합니다」가 안 보인다');
    await this.driver.$(규칙화면.동의버튼).click();
  }

  async 동의안함누르기(): Promise<void> {
    if (!(await 뜰때까지(this.driver, 규칙화면.동의안함버튼, 10_000))) throw new Error('서버 규칙 「동의 안 함」이 안 보인다');
    await this.driver.$(규칙화면.동의안함버튼).click();
  }

  async 상위누르기(): Promise<void> {
    await this.driver.$(규칙화면.상위버튼).click();
  }
}
