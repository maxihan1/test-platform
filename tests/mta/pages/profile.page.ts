import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지, 보이나, 사라질때까지, 요소안에서밀기 } from '@platform/kit/parts';

import { 꾸러미, 모든글자, 모든요소, 목록안글자, 앱id } from '../helpers/app.helper.js';

export type 프로필수 = '팔로워' | '팔로잉' | '게시물' | '가입';

const 수id: Record<프로필수, string> = {
  팔로워: 'followers_count',
  팔로잉: 'following_count',
  게시물: 'posts_count',
  가입: 'join_date',
};

export class 프로필화면 {
  static readonly 주소 = 'app:.MainActivity/타임라인';
  static readonly 동작버튼 = 앱id('profile_action_btn');
  static readonly 추가옵션 = 앱id('options_btn');
  static readonly 알림종 = 앱id('notifications_btn');
  static readonly 상단옵션 = '~옵션 더보기';
  static readonly 헤더이미지 = '~헤더 이미지';
  static readonly 아바타 = '~프로필 이미지';
  static readonly 이름 = `android=new UiSelector().resourceId("${꾸러미}:id/profile_header").childSelector(new UiSelector().resourceId("${꾸러미}:id/name"))`;
  static readonly 계정 = 앱id('username');
  static readonly 도움말 = 앱id('username_help');
  static readonly 배지묶음 = 앱id('badges');
  static readonly 배지글들 = `android=new UiSelector().resourceId("${꾸러미}:id/badges").childSelector(new UiSelector().className("android.widget.TextView"))`;
  static readonly 소개 = 앱id('bio');
  static readonly 항목묶음 = 앱id('fields');
  static readonly 항목값들 = `android=new UiSelector().resourceId("${꾸러미}:id/fields").childSelector(new UiSelector().resourceId("${꾸러미}:id/value"))`;
  static readonly 항목제목들 = `android=new UiSelector().resourceId("${꾸러미}:id/fields").childSelector(new UiSelector().resourceId("${꾸러미}:id/title"))`;
  static readonly 팔로워버튼 = 앱id('followers_btn');
  static readonly 팔로잉버튼 = 앱id('following_btn');
  static readonly 아는팔로워줄 = 앱id('familiar_followers');
  static readonly 아는팔로워글 = 앱id('familiar_followers_label');
  static readonly 바깥스크롤 = 앱id('scroller');
  static readonly 위막대제목 = `android=new UiSelector().resourceId("${꾸러미}:id/toolbar").childSelector(new UiSelector().className("android.widget.TextView"))`;

  static 수주소(이름: 프로필수): string {
    return 앱id(수id[이름]);
  }

  static 수글주소(이름: 프로필수, 글자: string): string {
    return `android=new UiSelector().resourceId("${꾸러미}:id/${수id[이름]}").text(${JSON.stringify(글자)})`;
  }

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 20_000): Promise<boolean> {
    return 뜰때까지(this.driver, 프로필화면.동작버튼, 시간);
  }

  async 이름글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 프로필화면.이름, 10_000))) return '';
    return this.driver.$(프로필화면.이름).getText();
  }

  async 계정글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 프로필화면.계정, 10_000))) return '';
    return this.driver.$(프로필화면.계정).getText();
  }

  async 헤더이미지있나(): Promise<boolean> {
    return 보이나(this.driver, 프로필화면.헤더이미지);
  }

  async 아바타있나(): Promise<boolean> {
    return 보이나(this.driver, 프로필화면.아바타);
  }

  async 도움말누르기(): Promise<void> {
    await this.driver.$(프로필화면.도움말).click();
  }

  async 배지있나(글자: string, 시간 = 5_000): Promise<boolean> {
    return 뜰때까지(this.driver, 목록안글자(글자, 'badges'), 시간);
  }

  async 나를팔로우배지있나(시간 = 5_000): Promise<boolean> {
    return 뜰때까지(this.driver, 목록안글자('Follows you', 'profile_header'), 시간);
  }

  async 배지글들(): Promise<string[]> {
    return 모든글자(this.driver, 프로필화면.배지글들);
  }

  async 소개있나(): Promise<boolean> {
    return 보이나(this.driver, 프로필화면.소개);
  }

  async 소개글(): Promise<string> {
    if (!(await this.소개있나())) return '';
    return this.driver.$(프로필화면.소개).getText();
  }

  async 항목있나(): Promise<boolean> {
    return 보이나(this.driver, 프로필화면.항목묶음);
  }

  async 항목제목글들(): Promise<string[]> {
    return 모든글자(this.driver, 프로필화면.항목제목들);
  }

  async 항목값글들(): Promise<string[]> {
    return 모든글자(this.driver, 프로필화면.항목값들);
  }

  async 항목값누르기(제목: string): Promise<void> {
    for (const 제목칸 of await 모든요소(this.driver, 프로필화면.항목제목들)) {
      if ((await 제목칸.getText()) !== 제목) continue;
      const 기준 = (await 제목칸.getLocation()).y;
      for (const 값칸 of await 모든요소(this.driver, 프로필화면.항목값들)) {
        if (Math.abs((await 값칸.getLocation()).y - 기준) < 120) {
          await 값칸.click();
          return;
        }
      }
    }
    throw new Error(`프로필 항목 「${제목}」의 값을 못 찾았다`);
  }

  async 수글(이름: 프로필수): Promise<string> {
    const 주소 = 프로필화면.수주소(이름);
    if (!(await 뜰때까지(this.driver, 주소, 10_000))) return '';
    return this.driver.$(주소).getText();
  }

  async 수글될때까지(이름: 프로필수, 글자: string, 시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, 프로필화면.수글주소(이름, 글자), 시간);
  }

  async 팔로워누르기(): Promise<void> {
    await this.driver.$(프로필화면.팔로워버튼).click();
  }

  async 팔로잉누르기(): Promise<void> {
    await this.driver.$(프로필화면.팔로잉버튼).click();
  }

  async 아는팔로워있나(시간 = 5_000): Promise<boolean> {
    return 뜰때까지(this.driver, 프로필화면.아는팔로워줄, 시간);
  }

  async 아는팔로워글(): Promise<string> {
    if (!(await this.아는팔로워있나())) return '';
    return this.driver.$(프로필화면.아는팔로워글).getText();
  }

  async 아는팔로워누르기(): Promise<void> {
    await this.driver.$(프로필화면.아는팔로워줄).click();
  }

  async 동작버튼글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 프로필화면.동작버튼, 10_000))) return '';
    return this.driver.$(프로필화면.동작버튼).getText();
  }

  async 동작버튼켜져있나(): Promise<boolean> {
    return (await this.driver.$(프로필화면.동작버튼).getAttribute('enabled')) === 'true';
  }

  async 동작버튼글될때까지(글자: string, 시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, 목록안글자(글자, 'profile_actions'), 시간);
  }

  async 동작버튼누르기(): Promise<void> {
    if (!(await 뜰때까지(this.driver, 프로필화면.동작버튼, 10_000))) throw new Error('프로필 동작 버튼이 안 보인다');
    await this.driver.$(프로필화면.동작버튼).click();
  }

  async 알림종있나(시간 = 3_000): Promise<boolean> {
    return 뜰때까지(this.driver, 프로필화면.알림종, 시간);
  }

  async 알림종설명(): Promise<string> {
    return (await this.driver.$(프로필화면.알림종).getAttribute('content-desc')) ?? '';
  }

  async 알림종누르기(): Promise<void> {
    await this.driver.$(프로필화면.알림종).click();
  }

  async 바깥으로내리기(번 = 1): Promise<void> {
    for (let i = 0; i < 번; i++) await 요소안에서밀기(this.driver, 프로필화면.바깥스크롤, '위');
  }

  async 당겨서새로고침(): Promise<void> {
    await 요소안에서밀기(this.driver, 프로필화면.바깥스크롤, '아래');
  }

  async 메뉴열기(기다릴항목?: string): Promise<void> {
    if (기다릴항목 === undefined) return this.메뉴한번열기();
    const 항목 = `android=new UiSelector().resourceId("android:id/title").text(${JSON.stringify(기다릴항목)})`;
    for (let i = 0; i < 3; i++) {
      await this.메뉴한번열기();
      if (await 뜰때까지(this.driver, 항목, 5_000)) return;
      await this.driver.back();
      await 사라질때까지(this.driver, 'id=android:id/title', 5_000);
    }
    throw new Error(`프로필 메뉴에 「${기다릴항목}」이 안 보인다`);
  }

  private async 메뉴한번열기(): Promise<void> {
    if (await 뜰때까지(this.driver, 프로필화면.추가옵션, 5_000)) {
      await this.driver.$(프로필화면.추가옵션).click();
      return;
    }
    await this.바깥으로내리기();
    if (!(await 뜰때까지(this.driver, 프로필화면.상단옵션, 5_000))) throw new Error('프로필 메뉴 버튼이 안 보인다');
    await this.driver.$(프로필화면.상단옵션).click();
  }

  async 위막대제목글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 프로필화면.위막대제목, 10_000))) return '';
    return this.driver.$(프로필화면.위막대제목).getText();
  }
}
