import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지 } from '@platform/kit/parts';

import { 꾸러미, 모든글자 } from '../helpers/app.helper.js';

export class 목록에추가화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 제목 = `android=new UiSelector().resourceId("${꾸러미}:id/toolbar").childSelector(new UiSelector().text("목록에 추가"))`;
  static readonly 안내 = `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().textMatches(".*가 표시되는 목록 관리하기$"))`;
  static readonly 목록이름들 = `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().resourceId("${꾸러미}:id/title"))`;

  static 목록줄(이름: string): string {
    return `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().resourceId("${꾸러미}:id/title").text(${JSON.stringify(이름)}))`;
  }

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, 목록에추가화면.제목, 시간);
  }

  async 안내글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 목록에추가화면.안내, 10_000))) return '';
    return this.driver.$(목록에추가화면.안내).getText();
  }

  async 목록이름글들(): Promise<string[]> {
    return 모든글자(this.driver, 목록에추가화면.목록이름들);
  }

  async 목록누르기(이름: string): Promise<void> {
    if (!(await 뜰때까지(this.driver, 목록에추가화면.목록줄(이름), 10_000))) throw new Error(`목록 「${이름}」 줄이 없다`);
    await this.driver.$(목록에추가화면.목록줄(이름)).click();
  }

  async 뒤로(): Promise<void> {
    await this.driver.$('~상위 메뉴로 이동').click();
  }
}
