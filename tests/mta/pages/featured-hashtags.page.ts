import type { AppDriver } from '@platform/kit/app';
import { 칸에적기, 뜰때까지 } from '@platform/kit/parts';

import { 꾸러미, 모든글자, 앱id } from '../helpers/app.helper.js';

export class 추천해시태그화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 제목 = `android=new UiSelector().resourceId("${꾸러미}:id/toolbar").childSelector(new UiSelector().text("Featured hashtags"))`;
  static readonly 태그들 = `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().resourceId("${꾸러미}:id/title"))`;
  static readonly 해시태그추가 = `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().className("android.widget.Button").text("Add hashtag"))`;
  static readonly 입력칸 = 앱id('edit');
  static readonly 추가버튼 = `android=new UiSelector().resourceId("${꾸러미}:id/toolbar").childSelector(new UiSelector().className("android.widget.Button"))`;

  static 삭제버튼(차례: number): string {
    return `android=new UiSelector().resourceId("${꾸러미}:id/trailing_icon").instance(${String(차례)})`;
  }

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 추천해시태그화면.제목, 시간);
  }

  async 태그글들(): Promise<string[]> {
    return 모든글자(this.driver, 추천해시태그화면.태그들);
  }

  async 해시태그추가있나(시간 = 3_000): Promise<boolean> {
    return 뜰때까지(this.driver, 추천해시태그화면.해시태그추가, 시간);
  }

  async 해시태그더하기(태그: string): Promise<void> {
    await this.driver.$(추천해시태그화면.해시태그추가).click();
    if (!(await 뜰때까지(this.driver, 추천해시태그화면.입력칸, 10_000))) throw new Error('「Add hashtag」 입력 칸이 안 열렸다');
    await 칸에적기(await this.driver.$(추천해시태그화면.입력칸).getElement(), 태그);
    await this.driver.$(추천해시태그화면.추가버튼).click();
  }

  async 입력칸힌트(): Promise<string> {
    return this.driver.$(추천해시태그화면.입력칸).getText();
  }

  async 삭제누르기(태그: string): Promise<void> {
    const i = (await this.태그글들()).indexOf(태그.startsWith('#') ? 태그 : `#${태그}`);
    if (i < 0) throw new Error(`추천 해시태그 「${태그}」가 없다`);
    await this.driver.$(추천해시태그화면.삭제버튼(i)).click();
  }

  async 뒤로(): Promise<void> {
    await this.driver.$('~상위 메뉴로 이동').click();
  }
}
