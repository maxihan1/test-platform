import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지 } from '@platform/kit/parts';

import { 글카드 } from '../components/status-card.component.js';
import { 하단탭 } from '../components/tabbar.component.js';
import { 꾸러미, 목록안글자, 앱id } from '../helpers/app.helper.js';
import { 홈화면 } from './home.page.js';
import { 검색화면 } from './search.page.js';

export class 해시태그화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/alt_button';
  static readonly 제목 = `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().resourceId("${꾸러미}:id/title"))`;
  static readonly 요약 = `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().resourceId("${꾸러미}:id/subtitle"))`;
  static readonly 팔로우버튼 = 앱id('profile_action_btn');

  readonly 카드: 글카드;

  constructor(private readonly driver: AppDriver) {
    this.카드 = new 글카드(driver);
  }

  static 드롭다운항목(글자: string): string {
    return `android=new UiSelector().className("android.widget.TextView").text(${JSON.stringify(글자)})`;
  }

  async 검색으로열기(태그: string): Promise<void> {
    const 검색 = new 검색화면(this.driver);
    await 검색.열기();
    await 검색.적기(`#${태그}`);
    await 검색.줄누르기(태그);
    if (!(await this.떴나())) throw new Error(`#${태그} 해시태그 타임라인이 안 열렸다`);
  }

  async 홈드롭다운에서열기(태그: string): Promise<void> {
    await new 하단탭(this.driver).누르기('홈');
    if (!(await 뜰때까지(this.driver, 홈화면.제목고르개, 15_000))) throw new Error('홈 제목 고르개가 안 보인다');
    await this.driver.$(홈화면.제목고르개).click();
    for (const 글자 of ['팔로우 중인 해시태그', `#${태그}`]) {
      if (!(await 뜰때까지(this.driver, 해시태그화면.드롭다운항목(글자), 10_000))) throw new Error(`드롭다운 「${글자}」가 안 보인다`);
      await this.driver.$(해시태그화면.드롭다운항목(글자)).click();
    }
    if (!(await this.떴나())) throw new Error(`#${태그} 해시태그 타임라인이 안 열렸다`);
  }

  async 떴나(시간 = 20_000): Promise<boolean> {
    return 뜰때까지(this.driver, 해시태그화면.팔로우버튼, 시간);
  }

  async 제목글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 해시태그화면.제목, 10_000))) return '';
    return this.driver.$(해시태그화면.제목).getText();
  }

  async 요약글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 해시태그화면.요약, 10_000))) return '';
    return this.driver.$(해시태그화면.요약).getText();
  }

  async 버튼글(): Promise<string> {
    if (!(await this.떴나())) return '';
    return this.driver.$(해시태그화면.팔로우버튼).getText();
  }

  async 버튼글될때까지(글자: string, 시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, 목록안글자(글자, 'follow_btn_wrap'), 시간);
  }

  async 버튼누르기(): Promise<void> {
    if (!(await this.떴나(10_000))) throw new Error('해시태그 팔로우 버튼이 안 보인다');
    await this.driver.$(해시태그화면.팔로우버튼).click();
  }

  async 글보이나(글자: string): Promise<boolean> {
    return this.카드.보이나(글자);
  }

  async 메뉴항목있나(글자: string): Promise<boolean> {
    const 메뉴버튼 = `android=new UiSelector().resourceId("${꾸러미}:id/toolbar").childSelector(new UiSelector().description("옵션 더보기"))`;
    if (!(await 뜰때까지(this.driver, 메뉴버튼, 3_000))) return false;
    await this.driver.$(메뉴버튼).click();
    const 있음 = await 뜰때까지(this.driver, `android=new UiSelector().resourceId("android:id/title").text(${JSON.stringify(글자)})`, 5_000);
    await this.driver.back();
    return 있음;
  }
}
