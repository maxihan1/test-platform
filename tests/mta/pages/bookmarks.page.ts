import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지 } from '@platform/kit/parts';

import { 글카드 } from '../components/status-card.component.js';
import { 펼친메뉴 } from '../components/popup-menu.component.js';
import { 하단탭 } from '../components/tabbar.component.js';
import { 꾸러미, 앱id } from '../helpers/app.helper.js';
import { 프로필화면 } from './profile.page.js';

export class 보관함화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 안내 = 앱id('banner_text');
  static readonly 위막대제목 = `android=new UiSelector().resourceId("${꾸러미}:id/toolbar").childSelector(new UiSelector().className("android.widget.TextView"))`;

  readonly 카드: 글카드;

  constructor(private readonly driver: AppDriver) {
    this.카드 = new 글카드(driver);
  }

  async 열기(이름: '보관함' | '즐겨찾기'): Promise<void> {
    await new 하단탭(this.driver).누르기('프로필');
    const 프로필 = new 프로필화면(this.driver);
    if (!(await 프로필.떴나())) throw new Error('내 프로필이 안 열렸다');
    await 프로필.메뉴열기();
    await new 펼친메뉴(this.driver).항목누르기(이름);
    if (!(await this.떴나())) throw new Error(`「${이름}」 화면이 안 열렸다`);
  }

  async 떴나(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, 보관함화면.안내, 시간);
  }

  async 안내글(): Promise<string> {
    if (!(await this.떴나())) return '';
    return this.driver.$(보관함화면.안내).getText();
  }

  async 위막대제목글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 보관함화면.위막대제목, 10_000))) return '';
    return this.driver.$(보관함화면.위막대제목).getText();
  }

  async 글보이나(글자: string): Promise<boolean> {
    return this.카드.보이나(글자);
  }
}
