import type { AppDriver } from '@platform/kit/app';
import { 될때까지, 보이나, 뜰때까지, 요소안에서밀기, type 앱요소 } from '@platform/kit/parts';

import { 꾸러미, 모든글자, 모든요소, 앱id, 토스트글읽기 } from '../helpers/app.helper.js';

export class 알림요청화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 제목 = `android=new UiSelector().resourceId("${꾸러미}:id/toolbar").childSelector(new UiSelector().className("android.widget.TextView"))`;
  static readonly 제목표지 = `android=new UiSelector().resourceId("${꾸러미}:id/toolbar").childSelector(new UiSelector().text("필터링된 알림"))`;
  static readonly 목록 = 앱id('list');
  static readonly 사용자들 = 앱id('username');
  static readonly 끝표시 = 앱id('end_mark');
  static readonly 상위버튼 = '~상위 메뉴로 이동';
  static readonly 토스트상자 = '//android.widget.Toast';

  static 사용자(사용자명: string): string {
    return `android=new UiSelector().resourceId("${꾸러미}:id/username").text(${JSON.stringify(알림요청화면.골뱅이(사용자명))})`;
  }

  static 몇째(id: string, 차례: number): string {
    return `android=new UiSelector().resourceId("${꾸러미}:id/${id}").instance(${String(차례)})`;
  }

  private static 골뱅이(사용자명: string): string {
    return 사용자명.startsWith('@') ? 사용자명 : `@${사용자명}`;
  }

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, 알림요청화면.제목표지, 시간);
  }

  async 제목글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 알림요청화면.제목, 10_000))) return '';
    return this.driver.$(알림요청화면.제목).getText();
  }

  async 사용자글들(): Promise<string[]> {
    return 모든글자(this.driver, 알림요청화면.사용자들);
  }

  async 줄있나(사용자명: string, 시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 알림요청화면.사용자(사용자명), 시간);
  }

  async 줄사라질때까지(사용자명: string, 시간 = 10_000): Promise<boolean> {
    return 될때까지(this.driver, async () => !(await 보이나(this.driver, 알림요청화면.사용자(사용자명))), 시간);
  }

  async 줄이름글(사용자명: string): Promise<string> {
    return (await this.줄요소('name', 사용자명)).getText();
  }

  async 배지글(사용자명: string): Promise<string> {
    return (await this.줄요소('badge', 사용자명)).getText();
  }

  async 아바타있나(사용자명: string): Promise<boolean> {
    return (await this.줄요소('ava', 사용자명)).isDisplayed();
  }

  async 허용버튼보이나(사용자명: string): Promise<boolean> {
    return (await this.줄요소('btn_allow', 사용자명)).isDisplayed();
  }

  async 해제버튼보이나(사용자명: string): Promise<boolean> {
    return (await this.줄요소('btn_mute', 사용자명)).isDisplayed();
  }

  async 허용누르기(사용자명: string): Promise<void> {
    await (await this.줄요소('btn_allow', 사용자명)).click();
  }

  async 해제누르기(사용자명: string): Promise<void> {
    await (await this.줄요소('btn_mute', 사용자명)).click();
  }

  async 줄누르기(사용자명: string): Promise<void> {
    if (!(await this.줄있나(사용자명))) throw new Error(`알림 요청 줄 「${사용자명}」이 안 보인다`);
    await this.driver.$(알림요청화면.사용자(사용자명)).click();
  }

  async 끝까지내리기(번 = 8): Promise<boolean> {
    for (let i = 0; i < 번; i++) {
      if (await 보이나(this.driver, 알림요청화면.끝표시)) return true;
      await 요소안에서밀기(this.driver, 알림요청화면.목록, '위');
    }
    return 보이나(this.driver, 알림요청화면.끝표시);
  }

  async 토스트(시간 = 10_000): Promise<string> {
    return 토스트글읽기(this.driver, 시간);
  }

  async 상위누르기(): Promise<void> {
    await this.driver.$(알림요청화면.상위버튼).click();
  }

  private async 줄요소(id: string, 사용자명: string): Promise<앱요소> {
    if (!(await this.줄있나(사용자명))) throw new Error(`알림 요청 줄 「${사용자명}」이 안 보인다`);
    const 기준 = (await this.driver.$(알림요청화면.사용자(사용자명)).getLocation()).y;
    const 요소들 = await 모든요소(this.driver, 앱id(id));
    let 고른: 앱요소 | undefined;
    let 거리 = Number.POSITIVE_INFINITY;
    for (const 요소 of 요소들) {
      const 차 = Math.abs((await 요소.getLocation()).y - 기준);
      if (차 < 거리) {
        거리 = 차;
        고른 = 요소;
      }
    }
    if (고른 === undefined) throw new Error(`알림 요청 줄 「${사용자명}」의 ${id} 를 못 찾았다`);
    return 고른;
  }

  static readonly 막대허용 = `android=new UiSelector().resourceId("${꾸러미}:id/allow").description("알림 허용")`;
  static readonly 막대해제 = `android=new UiSelector().resourceId("${꾸러미}:id/mute").description("알림 요청 해제")`;

  async 사람알림화면떴나(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, 알림요청화면.막대허용, 시간);
  }

  async 사람알림제목글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 'android=new UiSelector().className("android.widget.TextView").textContains(" 로부터의 알림")', 10_000))) return '';
    return this.driver.$('android=new UiSelector().className("android.widget.TextView").textContains(" 로부터의 알림")').getText();
  }

  async 막대허용있나(시간 = 5_000): Promise<boolean> {
    return 뜰때까지(this.driver, 알림요청화면.막대허용, 시간);
  }

  async 막대해제있나(시간 = 5_000): Promise<boolean> {
    return 뜰때까지(this.driver, 알림요청화면.막대해제, 시간);
  }
}
