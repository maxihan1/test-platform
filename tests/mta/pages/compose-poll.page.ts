import type { AppDriver } from '@platform/kit/app';
import { 끌어놓기, 될때까지, 뜰때까지, 보이나, 사라질때까지, 칸에적기 } from '@platform/kit/parts';

import { 꾸러미, 모든글자, 모든요소, 앱id } from '../helpers/app.helper.js';
import { 고르기창글들, 고르기창줄골라졌나, 고르기창줄누르기, 고르기창떴나 } from '../helpers/system-ui.helper.js';

export class 글쓰기투표 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 투표칸 = 앱id('poll_wrap');
  static readonly 항목칸들 = 앱id('edit');
  static readonly 항목추가 = '~투표 옵션 추가';
  static readonly 설문길이줄 = 앱id('poll_duration');
  static readonly 설문길이값 = 앱id('poll_duration_value');
  static readonly 스타일줄 = 앱id('poll_style');
  static readonly 스타일값 = 앱id('poll_style_value');
  static readonly 설정줄 = 앱id('poll_settings');

  static 항목(차례: number): string {
    return `android=new UiSelector().resourceId("${꾸러미}:id/edit").instance(${String(차례)})`;
  }

  static 손잡이(차례: number): string {
    return `android=new UiSelector().resourceId("${꾸러미}:id/dragger_thingy").instance(${String(차례)})`;
  }

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 글쓰기투표.투표칸, 시간);
  }

  async 투표칸사라질때까지(시간 = 10_000): Promise<boolean> {
    return 사라질때까지(this.driver, 글쓰기투표.투표칸, 시간);
  }

  async 항목수(): Promise<number> {
    return (await 모든요소(this.driver, 글쓰기투표.항목칸들)).length;
  }

  async 항목글들(): Promise<string[]> {
    return 모든글자(this.driver, 글쓰기투표.항목칸들);
  }

  async 항목글(차례: number): Promise<string> {
    return this.driver.$(글쓰기투표.항목(차례)).getText();
  }

  async 항목적기(차례: number, 글: string): Promise<void> {
    if (!(await 뜰때까지(this.driver, 글쓰기투표.항목(차례), 10_000))) throw new Error(`투표 항목 ${String(차례 + 1)}번 칸이 안 보인다`);
    await 칸에적기(await this.driver.$(글쓰기투표.항목(차례)).getElement(), 글);
  }

  async 항목추가있나(): Promise<boolean> {
    return 보이나(this.driver, 글쓰기투표.항목추가);
  }

  async 항목추가켜졌나(): Promise<boolean> {
    return (await this.driver.$(글쓰기투표.항목추가).getAttribute('enabled')) === 'true';
  }

  async 항목추가누르기(): Promise<void> {
    if (!(await 뜰때까지(this.driver, 글쓰기투표.항목추가, 10_000))) throw new Error('「투표 옵션 추가」가 안 보인다');
    await this.driver.$(글쓰기투표.항목추가).click();
  }

  async 항목이될때까지(개수: number, 시간 = 10_000): Promise<boolean> {
    return 될때까지(this.driver, async () => (await this.항목수()) === 개수, 시간);
  }

  async 설문길이있나(): Promise<boolean> {
    return 뜰때까지(this.driver, 글쓰기투표.설문길이줄, 5_000);
  }

  async 설문길이글(): Promise<string> {
    return this.driver.$(글쓰기투표.설문길이값).getText();
  }

  async 설문길이누르기(): Promise<void> {
    await this.driver.$(글쓰기투표.설문길이줄).click();
  }

  async 스타일있나(): Promise<boolean> {
    return 뜰때까지(this.driver, 글쓰기투표.스타일줄, 5_000);
  }

  async 스타일글(): Promise<string> {
    return this.driver.$(글쓰기투표.스타일값).getText();
  }

  async 스타일누르기(): Promise<void> {
    await this.driver.$(글쓰기투표.스타일줄).click();
  }

  static readonly 스타일창단일 = 앱id('single_choice');
  static readonly 스타일창다중 = 앱id('multiple_choice');
  static readonly 스타일창글들 = 'android=new UiSelector().resourceId("android:id/custom").childSelector(new UiSelector().className("android.widget.TextView"))';

  async 스타일창떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 글쓰기투표.스타일창단일, 시간);
  }

  async 스타일창글읽기(): Promise<string[]> {
    return 모든글자(this.driver, 글쓰기투표.스타일창글들);
  }

  async 선택창떴나(시간 = 10_000): Promise<boolean> {
    return 고르기창떴나(this.driver, 시간);
  }

  async 선택창글들(): Promise<string[]> {
    return 고르기창글들(this.driver);
  }

  async 선택창골라졌나(글자: string): Promise<boolean> {
    return 고르기창줄골라졌나(this.driver, 글자);
  }

  async 선택창고르기(글자: string): Promise<void> {
    await 고르기창줄누르기(this.driver, 글자);
  }

  async 손잡이끌기(어디서: number, 어디로: number): Promise<void> {
    await 끌어놓기(this.driver, 글쓰기투표.손잡이(어디서), 글쓰기투표.항목(어디로));
  }
}
