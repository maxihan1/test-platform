import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지, 먼저뜨는것, 칸비우기, 칸에적기, 포커스칸에치기 } from '@platform/kit/parts';

import { 꾸러미, 모든글자, 목록안글자포함, 앱id } from '../helpers/app.helper.js';

export class 목록만들기화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 위막대글들 = `android=new UiSelector().resourceId("${꾸러미}:id/toolbar").childSelector(new UiSelector().className("android.widget.TextView"))`;
  static readonly 이름칸 = 앱id('edit');
  static readonly 답장대상 = 앱id('spinner');
  static readonly 답장대상글 = `android=new UiSelector().resourceId("${꾸러미}:id/spinner").childSelector(new UiSelector().className("android.widget.TextView"))`;
  static readonly 숨기기스위치 = `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().className("android.widget.Switch"))`;
  static readonly 단계버튼 = 앱id('btn_next');
  static readonly 구성원추가 = '~구성원 추가';
  static readonly 구성원없음 = 앱id('empty_text');
  static readonly 구성원검색안내 = 앱id('empty_text_secondary');
  static readonly 구성원검색칸 = 'android=new UiSelector().className("android.widget.EditText")';
  static readonly 검색결과없음 = 앱id('empty_text');

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, 목록만들기화면.이름칸, 시간);
  }

  async 위막대글읽기(): Promise<string[]> {
    return 모든글자(this.driver, 목록만들기화면.위막대글들);
  }

  async 단계글될때까지(글자: string, 시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, 목록안글자포함(글자, 'toolbar'), 시간);
  }

  async 이름값(): Promise<string> {
    if (!(await this.떴나())) return '';
    return this.driver.$(목록만들기화면.이름칸).getText();
  }

  async 이름적기(글: string): Promise<void> {
    if (!(await this.떴나())) throw new Error('목록 이름 칸이 안 보인다');
    await 칸에적기(await this.driver.$(목록만들기화면.이름칸).getElement(), 글);
  }

  async 이름비우기(): Promise<void> {
    if (!(await this.떴나())) throw new Error('목록 이름 칸이 안 보인다');
    await 칸비우기(await this.driver.$(목록만들기화면.이름칸).getElement());
  }

  async 글있나(글자: string, 시간 = 5_000): Promise<boolean> {
    return 뜰때까지(this.driver, 목록안글자포함(글자, 'list'), 시간);
  }

  async 답장대상글읽기(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 목록만들기화면.답장대상글, 5_000))) return '';
    return this.driver.$(목록만들기화면.답장대상글).getText();
  }

  async 숨기기스위치있나(시간 = 3_000): Promise<boolean> {
    return 뜰때까지(this.driver, 목록만들기화면.숨기기스위치, 시간);
  }

  async 숨기기스위치켜졌나(): Promise<boolean> {
    return (await this.driver.$(목록만들기화면.숨기기스위치).getAttribute('checked')) === 'true';
  }

  async 숨기기스위치누르기(): Promise<void> {
    await this.driver.$(목록만들기화면.숨기기스위치).click();
  }

  async 단계버튼글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 목록만들기화면.단계버튼, 10_000))) return '';
    return this.driver.$(목록만들기화면.단계버튼).getText();
  }

  async 단계버튼누르기(): Promise<void> {
    if (!(await 뜰때까지(this.driver, 목록만들기화면.단계버튼, 10_000))) throw new Error('목록 만들기 단계 버튼이 안 보인다');
    await this.driver.$(목록만들기화면.단계버튼).click();
  }

  async 두번째단계떴나(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, 목록만들기화면.구성원추가, 시간);
  }

  async 구성원없음글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 목록만들기화면.구성원없음, 10_000))) return '';
    return this.driver.$(목록만들기화면.구성원없음).getText();
  }

  async 구성원검색안내글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 목록만들기화면.구성원검색안내, 10_000))) return '';
    return this.driver.$(목록만들기화면.구성원검색안내).getText();
  }

  async 구성원추가누르기(): Promise<void> {
    if (!(await this.두번째단계떴나(10_000))) throw new Error('「구성원 추가」 버튼이 안 보인다');
    await this.driver.$(목록만들기화면.구성원추가).click();
  }

  async 구성원검색열기(): Promise<void> {
    await this.구성원추가누르기();
    if (!(await 뜰때까지(this.driver, 목록만들기화면.구성원검색칸, 10_000))) throw new Error('구성원 검색 칸이 안 보인다');
  }

  async 구성원검색적기(글: string): Promise<void> {
    await this.driver.$(목록만들기화면.구성원검색칸).click();
    await 포커스칸에치기(this.driver, 글);
  }

  static 검색결과사용자(사용자명: string): string {
    return `android=new UiSelector().resourceId("${꾸러미}:id/username").text(${JSON.stringify(`@${사용자명}`)})`;
  }

  async 구성원검색끝날때까지(사용자명: string, 시간 = 15_000): Promise<boolean> {
    const 뜬것 = await 먼저뜨는것(this.driver, { 없음: 목록만들기화면.검색결과없음, 그사람: 목록만들기화면.검색결과사용자(사용자명) }, 시간);
    return 뜬것 !== undefined;
  }

  async 검색결과사용자있나(사용자명: string, 시간 = 3_000): Promise<boolean> {
    return 뜰때까지(this.driver, 목록만들기화면.검색결과사용자(사용자명), 시간);
  }
}
