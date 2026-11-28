import type { AppDriver } from '@platform/kit/app';
import { type 앱요소, 뜰때까지, 요소안에서밀기 } from '@platform/kit/parts';

import { 꾸러미, 모든글자, 모든요소, 목록안글자, 앱id } from '../helpers/app.helper.js';

export class 팔로우목록화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 목록 = 앱id('list');
  static readonly 위막대글 = `android=new UiSelector().resourceId("${꾸러미}:id/toolbar").childSelector(new UiSelector().className("android.widget.TextView"))`;
  static readonly 계정들 = `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().resourceId("${꾸러미}:id/username"))`;
  static readonly 버튼들 = `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().resourceId("${꾸러미}:id/button"))`;

  static 계정(사용자명: string): string {
    return 목록안글자(`@${사용자명}`, 'list');
  }

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, 팔로우목록화면.계정들, 시간);
  }

  async 위막대글들(): Promise<string[]> {
    return 모든글자(this.driver, 팔로우목록화면.위막대글);
  }

  async 계정글들(): Promise<string[]> {
    return 모든글자(this.driver, 팔로우목록화면.계정들);
  }

  async 버튼글들(): Promise<string[]> {
    return 모든글자(this.driver, 팔로우목록화면.버튼들);
  }

  async 계정있나(사용자명: string, 시간 = 5_000): Promise<boolean> {
    return 뜰때까지(this.driver, 팔로우목록화면.계정(사용자명), 시간);
  }

  async 계정누르기(사용자명: string): Promise<void> {
    if (!(await this.계정있나(사용자명, 10_000))) throw new Error(`목록에 @${사용자명} 줄이 안 보인다`);
    await this.driver.$(팔로우목록화면.계정(사용자명)).click();
  }

  private async 줄버튼(사용자명: string): Promise<앱요소> {
    if (!(await this.계정있나(사용자명, 10_000))) throw new Error(`목록에 @${사용자명} 줄이 안 보인다`);
    const 기준 = (await this.driver.$(팔로우목록화면.계정(사용자명)).getLocation()).y;
    for (const 버튼 of await 모든요소(this.driver, 팔로우목록화면.버튼들)) {
      if (Math.abs((await 버튼.getLocation()).y - 기준) < 150) return 버튼;
    }
    throw new Error(`@${사용자명} 줄의 버튼을 못 찾았다`);
  }

  async 버튼글(사용자명: string): Promise<string> {
    return (await this.줄버튼(사용자명)).getText();
  }

  async 버튼누르기(사용자명: string): Promise<void> {
    await (await this.줄버튼(사용자명)).click();
  }

  async 끝까지내리기(최대번 = 10): Promise<string[]> {
    const 본것 = new Set<string>();
    for (let i = 0; i < 최대번; i++) {
      const 전 = 본것.size;
      for (const 글 of await this.계정글들()) 본것.add(글);
      if (i > 0 && 본것.size === 전) break;
      await 요소안에서밀기(this.driver, 팔로우목록화면.목록, '위');
    }
    return [...본것];
  }
}
