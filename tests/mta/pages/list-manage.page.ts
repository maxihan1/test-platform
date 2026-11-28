import type { AppDriver } from '@platform/kit/app';
import { type 앱요소, 뜰때까지 } from '@platform/kit/parts';

import { 하단탭 } from '../components/tabbar.component.js';
import { 꾸러미, 모든글자, 모든요소, 목록안글자, 앱id } from '../helpers/app.helper.js';
import { 홈화면 } from './home.page.js';

export class 목록관리화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 위막대제목 = `android=new UiSelector().resourceId("${꾸러미}:id/toolbar").childSelector(new UiSelector().className("android.widget.TextView"))`;
  static readonly 줄이름들 = `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().resourceId("${꾸러미}:id/title"))`;
  static readonly 줄버튼들 = `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().resourceId("${꾸러미}:id/options_btn"))`;
  static readonly 만들기버튼 = '~목록 만들기';
  static readonly 구성원버튼 = 앱id('members');
  static readonly 관리버튼 = 앱id('edit_list');
  static readonly 타임라인빈글 = 앱id('empty_text');

  static 줄(이름: string): string {
    return 목록안글자(이름, 'list');
  }

  static 드롭다운항목(글자: string): string {
    return `android=new UiSelector().className("android.widget.TextView").text(${JSON.stringify(글자)})`;
  }

  constructor(private readonly driver: AppDriver) {}

  async 드롭다운항목누르기(글자: string): Promise<void> {
    if (!(await 뜰때까지(this.driver, 목록관리화면.드롭다운항목(글자), 10_000))) throw new Error(`드롭다운 「${글자}」가 안 보인다`);
    await this.driver.$(목록관리화면.드롭다운항목(글자)).click();
  }

  async 열기(): Promise<void> {
    await new 하단탭(this.driver).누르기('홈');
    if (!(await 뜰때까지(this.driver, 홈화면.제목고르개, 15_000))) throw new Error('홈 제목 고르개가 안 보인다');
    await this.driver.$(홈화면.제목고르개).click();
    await this.드롭다운항목누르기('목록');
    await this.드롭다운항목누르기('목록 관리');
    if (!(await this.떴나())) throw new Error('목록 관리 화면이 안 열렸다');
  }

  async 떴나(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, 목록관리화면.만들기버튼, 시간);
  }

  async 위막대제목글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 목록관리화면.위막대제목, 10_000))) return '';
    return this.driver.$(목록관리화면.위막대제목).getText();
  }

  async 줄이름글들(): Promise<string[]> {
    return 모든글자(this.driver, 목록관리화면.줄이름들);
  }

  async 줄있나(이름: string, 시간 = 5_000): Promise<boolean> {
    return 뜰때까지(this.driver, 목록관리화면.줄(이름), 시간);
  }

  async 줄누르기(이름: string): Promise<void> {
    if (!(await this.줄있나(이름, 10_000))) throw new Error(`목록 관리에 「${이름}」 줄이 안 보인다`);
    await this.driver.$(목록관리화면.줄(이름)).click();
  }

  private async 줄버튼(이름: string): Promise<앱요소> {
    if (!(await this.줄있나(이름, 10_000))) throw new Error(`목록 관리에 「${이름}」 줄이 안 보인다`);
    const 기준 = (await this.driver.$(목록관리화면.줄(이름)).getLocation()).y;
    for (const 버튼 of await 모든요소(this.driver, 목록관리화면.줄버튼들)) {
      if (Math.abs((await 버튼.getLocation()).y - 기준) < 100) return 버튼;
    }
    throw new Error(`「${이름}」 줄의 옵션 버튼을 못 찾았다`);
  }

  async 줄옵션누르기(이름: string): Promise<void> {
    await (await this.줄버튼(이름)).click();
  }

  async 만들기있나(시간 = 5_000): Promise<boolean> {
    return 뜰때까지(this.driver, 목록관리화면.만들기버튼, 시간);
  }

  async 만들기누르기(): Promise<void> {
    if (!(await this.만들기있나(10_000))) throw new Error('「목록 만들기」 버튼이 안 보인다');
    await this.driver.$(목록관리화면.만들기버튼).click();
  }

  async 타임라인도구줄떴나(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, 목록관리화면.관리버튼, 시간);
  }

  async 타임라인구성원설명(): Promise<string> {
    return (await this.driver.$(목록관리화면.구성원버튼).getAttribute('content-desc')) ?? '';
  }

  async 타임라인관리설명(): Promise<string> {
    return (await this.driver.$(목록관리화면.관리버튼).getAttribute('content-desc')) ?? '';
  }

  async 타임라인관리누르기(): Promise<void> {
    if (!(await this.타임라인도구줄떴나(10_000))) throw new Error('목록 타임라인 도구 줄의 「목록 관리」가 안 보인다');
    await this.driver.$(목록관리화면.관리버튼).click();
  }

  async 타임라인구성원누르기(): Promise<void> {
    if (!(await this.타임라인도구줄떴나(10_000))) throw new Error('목록 타임라인 도구 줄의 「리스트 구성원」이 안 보인다');
    await this.driver.$(목록관리화면.구성원버튼).click();
  }
}
