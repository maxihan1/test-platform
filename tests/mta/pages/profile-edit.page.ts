import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지, 스크롤해서찾기 } from '@platform/kit/parts';

import { 하단탭 } from '../components/tabbar.component.js';
import { 꾸러미, 목록안글자, 앱id } from '../helpers/app.helper.js';

export class 프로필편집화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 내프로필동작버튼 = 앱id('profile_action_btn');
  static readonly 위막대제목 = `android=new UiSelector().resourceId("${꾸러미}:id/toolbar").childSelector(new UiSelector().className("android.widget.TextView"))`;
  static readonly 헤더이미지 = '~헤더 이미지';
  static readonly 아바타 = '~프로필 이미지';
  static readonly 이름제목 = 목록안글자('Display name', 'list');
  static readonly 이름값 = `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().resourceId("${꾸러미}:id/subtitle").instance(0))`;
  static readonly 소개추가줄 = 목록안글자('Add bio', 'list');
  static readonly 항목줄 = `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().textStartsWith("Custom fields"))`;
  static readonly 해시태그줄 = `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().textStartsWith("Featured hashtags"))`;
  static readonly 탭설정줄 = 목록안글자('Profile tab settings', 'list');

  constructor(private readonly driver: AppDriver) {}

  async 열기(): Promise<void> {
    await new 하단탭(this.driver).누르기('프로필');
    if (!(await 뜰때까지(this.driver, 프로필편집화면.내프로필동작버튼, 20_000))) throw new Error('내 프로필 동작 버튼이 안 보인다');
    await this.driver.$(프로필편집화면.내프로필동작버튼).click();
    if (!(await this.떴나())) throw new Error('프로필 편집 화면이 안 열렸다');
  }

  async 떴나(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, 프로필편집화면.이름제목, 시간);
  }

  async 위막대제목글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 프로필편집화면.위막대제목, 10_000))) return '';
    return this.driver.$(프로필편집화면.위막대제목).getText();
  }

  async 헤더이미지누르기(): Promise<void> {
    if (!(await 뜰때까지(this.driver, 프로필편집화면.헤더이미지, 10_000))) throw new Error('헤더 이미지가 안 보인다');
    await this.driver.$(프로필편집화면.헤더이미지).click();
  }

  async 아바타누르기(): Promise<void> {
    if (!(await 뜰때까지(this.driver, 프로필편집화면.아바타, 10_000))) throw new Error('프로필 이미지가 안 보인다');
    await this.driver.$(프로필편집화면.아바타).click();
  }

  async 이름줄누르기(): Promise<void> {
    if (!(await this.떴나(10_000))) throw new Error('「Display name」 줄이 안 보인다');
    await this.driver.$(프로필편집화면.이름제목).click();
  }

  async 이름값글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 프로필편집화면.이름값, 10_000))) return '';
    return this.driver.$(프로필편집화면.이름값).getText();
  }

  async 소개추가줄있나(시간 = 3_000): Promise<boolean> {
    return 뜰때까지(this.driver, 프로필편집화면.소개추가줄, 시간);
  }

  async 소개추가줄누르기(): Promise<void> {
    if (!(await this.소개추가줄있나(10_000))) throw new Error('「Add bio」 줄이 안 보인다');
    await this.driver.$(프로필편집화면.소개추가줄).click();
  }

  async 항목줄글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 프로필편집화면.항목줄, 10_000))) return '';
    return this.driver.$(프로필편집화면.항목줄).getText();
  }

  async 항목줄누르기(): Promise<void> {
    if (!(await 뜰때까지(this.driver, 프로필편집화면.항목줄, 10_000))) throw new Error('「Custom fields」 줄이 안 보인다');
    await this.driver.$(프로필편집화면.항목줄).click();
  }

  async 해시태그줄글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 프로필편집화면.해시태그줄, 10_000))) return '';
    return this.driver.$(프로필편집화면.해시태그줄).getText();
  }

  async 해시태그줄누르기(): Promise<void> {
    if (!(await 뜰때까지(this.driver, 프로필편집화면.해시태그줄, 10_000))) throw new Error('「Featured hashtags」 줄이 안 보인다');
    await this.driver.$(프로필편집화면.해시태그줄).click();
  }

  async 탭설정줄있나(시간 = 3_000): Promise<boolean> {
    return 뜰때까지(this.driver, 프로필편집화면.탭설정줄, 시간);
  }

  async 탭설정줄누르기(): Promise<void> {
    if (!(await this.탭설정줄있나(5_000))) await 스크롤해서찾기(this.driver, 'Profile tab settings');
    await this.driver.$(프로필편집화면.탭설정줄).click();
  }
}
