import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지 } from '@platform/kit/parts';

import { 펼친메뉴 } from '../components/popup-menu.component.js';
import { 꾸러미, 모든글자, 앱id } from '../helpers/app.helper.js';

export class 구성원화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 제목 = `android=new UiSelector().resourceId("${꾸러미}:id/toolbar").childSelector(new UiSelector().text("리스트 구성원"))`;
  static readonly 사용자명들 = `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().resourceId("${꾸러미}:id/username"))`;
  static readonly 선택수 = 'id=android:id/action_bar_title';
  static readonly 제거 = 앱id('delete');
  static readonly 선택끝 = '~완료';
  static readonly 구성원추가 = 앱id('fab');

  static 사용자줄(사용자명: string): string {
    return `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().resourceId("${꾸러미}:id/username").text(${JSON.stringify(`@${사용자명}`)}))`;
  }

  readonly 메뉴: 펼친메뉴;

  constructor(private readonly driver: AppDriver) {
    this.메뉴 = new 펼친메뉴(driver);
  }

  async 떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 구성원화면.제목, 시간);
  }

  async 사용자명글들(): Promise<string[]> {
    return 모든글자(this.driver, 구성원화면.사용자명들);
  }

  async 선택모드켜기(): Promise<void> {
    await this.driver.$('~옵션 더보기').click();
    await this.메뉴.항목누르기('선택');
  }

  async 전체선택메뉴있나(): Promise<boolean> {
    await this.driver.$('~옵션 더보기').click();
    const 있음 = await this.메뉴.항목있나('전체 선택', 5_000);
    await this.메뉴.닫기();
    return 있음;
  }

  async 줄누르기(사용자명: string): Promise<void> {
    if (!(await 뜰때까지(this.driver, 구성원화면.사용자줄(사용자명), 10_000))) throw new Error(`구성원 @${사용자명} 줄이 없다`);
    await this.driver.$(구성원화면.사용자줄(사용자명)).click();
  }

  async 선택수글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 구성원화면.선택수, 5_000))) return '';
    return this.driver.$(구성원화면.선택수).getText();
  }

  async 제거누르기(): Promise<void> {
    await this.driver.$(구성원화면.제거).click();
  }

  async 선택끝내기(): Promise<void> {
    if (await 뜰때까지(this.driver, 구성원화면.선택끝, 3_000)) await this.driver.$(구성원화면.선택끝).click();
  }

  async 뒤로(): Promise<void> {
    await this.driver.$('~뒤로 가기').click();
  }
}
