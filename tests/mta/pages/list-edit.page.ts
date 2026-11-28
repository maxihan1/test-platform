import type { AppDriver } from '@platform/kit/app';
import { 칸에적기, 뜰때까지 } from '@platform/kit/parts';

import { 펼친메뉴 } from '../components/popup-menu.component.js';
import { 꾸러미, 앱id } from '../helpers/app.helper.js';
import { 줄스위치있나 } from '../helpers/system-ui.helper.js';

export class 목록편집화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 이름칸 = 앱id('edit');
  static readonly 답장고르개 = 앱id('spinner');
  static readonly 답장값 = `android=new UiSelector().resourceId("${꾸러미}:id/spinner").childSelector(new UiSelector().resourceId("android:id/text1"))`;
  static readonly 구성원줄 = `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().resourceId("${꾸러미}:id/title").text("리스트 구성원"))`;
  static readonly 옵션더보기 = '~옵션 더보기';

  readonly 메뉴: 펼친메뉴;

  constructor(private readonly driver: AppDriver) {
    this.메뉴 = new 펼친메뉴(driver);
  }

  async 떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 목록편집화면.구성원줄, 시간);
  }

  async 이름칸있나(): Promise<boolean> {
    return 뜰때까지(this.driver, 목록편집화면.이름칸, 3_000);
  }

  async 이름값(): Promise<string> {
    return this.driver.$(목록편집화면.이름칸).getText();
  }

  async 이름적기(글: string): Promise<void> {
    await 칸에적기(await this.driver.$(목록편집화면.이름칸).getElement(), 글);
  }

  async 답장정책글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 목록편집화면.답장값, 5_000))) return '';
    return this.driver.$(목록편집화면.답장값).getText();
  }

  async 숨기기스위치있나(): Promise<boolean> {
    return 줄스위치있나(this.driver, '팔로우 중인 구성원 숨기기');
  }

  async 구성원있나(): Promise<boolean> {
    return 뜰때까지(this.driver, 목록편집화면.구성원줄, 3_000);
  }

  async 구성원누르기(): Promise<void> {
    await this.driver.$(목록편집화면.구성원줄).click();
  }

  async 삭제메뉴있나(): Promise<boolean> {
    await this.driver.$(목록편집화면.옵션더보기).click();
    const 있음 = await this.메뉴.항목있나('리스트 삭제', 5_000);
    await this.메뉴.닫기();
    return 있음;
  }

  async 삭제누르기(): Promise<void> {
    await this.driver.$(목록편집화면.옵션더보기).click();
    await this.메뉴.항목누르기('리스트 삭제');
  }

  async 뒤로(): Promise<void> {
    await this.driver.$('~상위 메뉴로 이동').click();
  }
}
