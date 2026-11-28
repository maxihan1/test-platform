import type { AppDriver } from '@platform/kit/app';
import { 될때까지, 보이나, 뜰때까지, 요소안에서밀기, type 앱요소 } from '@platform/kit/parts';

import { 꾸러미, 모든글자, 모든요소, 목록안글자, 앱id, 토스트글읽기 } from '../helpers/app.helper.js';

export type 알림탭 = '모든 것' | '멘션';

export class 알림화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 목록 = 앱id('list');
  static readonly 모두읽음버튼 = 앱id('mark_all_read');
  static readonly 제외조건버튼 = 앱id('filters');
  static readonly 모든것탭 = 앱id('all_tab');
  static readonly 멘션탭 = 앱id('mentions_tab');
  static readonly 모든것탭글 = 앱id('all_text');
  static readonly 멘션탭글 = 앱id('mentions_text');
  static readonly 줄글들 = `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().resourceId("${꾸러미}:id/text"))`;
  static readonly 요청줄제목 = `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().resourceId("${꾸러미}:id/title"))`;
  static readonly 요청줄부제 = `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().resourceId("${꾸러미}:id/subtitle"))`;
  static readonly 끝표시 = 앱id('end_mark');
  static readonly 이어불러오는중 = 앱id('load_more_progress');
  static readonly 토스트상자 = '//android.widget.Toast';

  static 줄(글자: string): string {
    return `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().resourceId("${꾸러미}:id/text").textContains(${JSON.stringify(글자)}))`;
  }

  static 아바타(이름: string): string {
    return `~${이름} 님의 프로필로 이동`;
  }

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, 알림화면.제외조건버튼, 시간);
  }

  private 탭주소(탭: 알림탭): string {
    return 탭 === '모든 것' ? 알림화면.모든것탭 : 알림화면.멘션탭;
  }

  async 탭있나(탭: 알림탭): Promise<boolean> {
    return 뜰때까지(this.driver, this.탭주소(탭), 5_000);
  }

  async 탭글(탭: 알림탭): Promise<string> {
    return this.driver.$(탭 === '모든 것' ? 알림화면.모든것탭글 : 알림화면.멘션탭글).getText();
  }

  async 탭골라졌나(탭: 알림탭): Promise<boolean> {
    return (await this.driver.$(this.탭주소(탭)).getAttribute('selected')) === 'true';
  }

  async 탭누르기(탭: 알림탭): Promise<void> {
    if (!(await this.탭있나(탭))) throw new Error(`알림 탭 「${탭}」이 안 보인다`);
    await this.driver.$(this.탭주소(탭)).click();
  }

  async 탭골라질때까지(탭: 알림탭, 시간 = 10_000): Promise<boolean> {
    return 될때까지(this.driver, () => this.탭골라졌나(탭), 시간);
  }

  async 모두읽음누르기(): Promise<void> {
    if (!(await 뜰때까지(this.driver, 알림화면.모두읽음버튼, 10_000))) throw new Error('알림 「모두 읽은 상태로 표시」가 안 보인다');
    await this.driver.$(알림화면.모두읽음버튼).click();
  }

  async 모두읽음버튼보이나(): Promise<boolean> {
    return 보이나(this.driver, 알림화면.모두읽음버튼);
  }

  async 제외조건버튼보이나(): Promise<boolean> {
    return 보이나(this.driver, 알림화면.제외조건버튼);
  }

  async 제외조건누르기(): Promise<void> {
    if (!(await 뜰때까지(this.driver, 알림화면.제외조건버튼, 10_000))) throw new Error('알림 「알림 제외 조건…」이 안 보인다');
    await this.driver.$(알림화면.제외조건버튼).click();
  }

  async 요청줄보이나(시간 = 5_000): Promise<boolean> {
    return 뜰때까지(this.driver, 알림화면.요청줄제목, 시간);
  }

  async 요청줄제목글(): Promise<string> {
    if (!(await this.요청줄보이나(10_000))) return '';
    return this.driver.$(알림화면.요청줄제목).getText();
  }

  async 요청줄부제글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 알림화면.요청줄부제, 5_000))) return '';
    return this.driver.$(알림화면.요청줄부제).getText();
  }

  async 요청줄누르기(): Promise<void> {
    if (!(await this.요청줄보이나(10_000))) throw new Error('알림 맨 위 「필터링된 알림」 줄이 안 보인다');
    await this.driver.$(알림화면.요청줄제목).click();
  }

  async 줄글읽기(): Promise<string[]> {
    return 모든글자(this.driver, 알림화면.줄글들);
  }

  async 줄있나(글자: string, 시간 = 5_000): Promise<boolean> {
    return 뜰때까지(this.driver, 알림화면.줄(글자), 시간);
  }

  async 줄찾을때까지내리기(글자: string, 번 = 6): Promise<boolean> {
    for (let i = 0; i <= 번; i++) {
      if (await this.줄있나(글자, 3_000)) return true;
      if (i < 번) await 요소안에서밀기(this.driver, 알림화면.목록, '위');
    }
    return false;
  }

  async 줄글(글자: string): Promise<string> {
    if (!(await this.줄있나(글자, 10_000))) return '';
    return this.driver.$(알림화면.줄(글자)).getText();
  }

  async 줄누르기(글자: string): Promise<void> {
    if (!(await this.줄있나(글자, 10_000))) throw new Error(`알림 줄 「${글자}」이 안 보인다`);
    await this.driver.$(알림화면.줄(글자)).click();
  }

  async 아바타있나(이름: string, 시간 = 5_000): Promise<boolean> {
    return 뜰때까지(this.driver, 알림화면.아바타(이름), 시간);
  }

  async 아바타누르기(이름: string): Promise<void> {
    if (!(await this.아바타있나(이름, 10_000))) throw new Error(`알림 아바타 「${이름}」이 안 보인다`);
    await this.driver.$(알림화면.아바타(이름)).click();
  }

  async 줄버튼있나(줄글자: string, 버튼글자: string): Promise<boolean> {
    return (await this.줄아래버튼(줄글자, 버튼글자)) !== undefined;
  }

  async 줄버튼누르기(줄글자: string, 버튼글자: string): Promise<void> {
    const 버튼 = await this.줄아래버튼(줄글자, 버튼글자);
    if (버튼 === undefined) throw new Error(`알림 줄 「${줄글자}」 아래 「${버튼글자}」 버튼이 안 보인다`);
    await 버튼.click();
  }

  async 끝까지내리기(번 = 12): Promise<boolean> {
    for (let i = 0; i < 번; i++) {
      if (await 보이나(this.driver, 알림화면.끝표시)) return true;
      await 요소안에서밀기(this.driver, 알림화면.목록, '위');
    }
    return 보이나(this.driver, 알림화면.끝표시);
  }

  async 이어불러오는중인가(): Promise<boolean> {
    return 보이나(this.driver, 알림화면.이어불러오는중);
  }

  async 줄수(): Promise<number> {
    return (await this.줄글읽기()).length;
  }

  async 토스트(시간 = 10_000): Promise<string> {
    return 토스트글읽기(this.driver, 시간);
  }

  private async 줄아래버튼(줄글자: string, 버튼글자: string): Promise<앱요소 | undefined> {
    if (!(await this.줄있나(줄글자, 5_000))) return undefined;
    const 기준 = (await this.driver.$(알림화면.줄(줄글자)).getLocation()).y;
    let 고른: 앱요소 | undefined;
    let 거리 = Number.POSITIVE_INFINITY;
    for (const 버튼 of await 모든요소(this.driver, 목록안글자(버튼글자))) {
      const 차 = (await 버튼.getLocation()).y - 기준;
      if (차 >= 0 && 차 < 거리) {
        거리 = 차;
        고른 = 버튼;
      }
    }
    return 고른;
  }
}
