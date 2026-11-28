import type { AppDriver } from '@platform/kit/app';
import { 칸비우기, 칸에적기, 뜰때까지 } from '@platform/kit/parts';

import { 꾸러미, 앱id } from '../helpers/app.helper.js';

export class 자기소개편집화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 칸 = 앱id('edit');
  static readonly 제목 = `android=new UiSelector().resourceId("${꾸러미}:id/toolbar").childSelector(new UiSelector().text("Edit bio"))`;
  static readonly 저장 = `android=new UiSelector().resourceId("${꾸러미}:id/toolbar").childSelector(new UiSelector().className("android.widget.Button"))`;

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 자기소개편집화면.제목, 시간);
  }

  async 값(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 자기소개편집화면.칸, 5_000))) return '';
    return this.driver.$(자기소개편집화면.칸).getText();
  }

  async 적기(글: string): Promise<void> {
    await 칸에적기(await this.driver.$(자기소개편집화면.칸).getElement(), 글);
  }

  async 비우기(): Promise<void> {
    await 칸비우기(await this.driver.$(자기소개편집화면.칸).getElement());
  }

  async 저장켜져있나(): Promise<boolean> {
    return (await this.driver.$(자기소개편집화면.저장).getAttribute('enabled')) === 'true';
  }

  async 저장누르기(): Promise<void> {
    await this.driver.$(자기소개편집화면.저장).click();
  }

  async 뒤로(): Promise<void> {
    await this.driver.$('~뒤로 가기').click();
  }
}
