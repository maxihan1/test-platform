import type { AppDriver } from '@platform/kit/app';
import { 칸비우기, 칸에적기, 뜰때까지 } from '@platform/kit/parts';

import { 하단탭 } from '../components/tabbar.component.js';
import { 모든글자, 목록안글자, 서버, 앱id, 토스트글읽기 } from '../helpers/app.helper.js';

export class 검색화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 둘러보기검색창 = 앱id('search_text');
  static readonly 입력칸 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/toolbar").childSelector(new UiSelector().className("android.widget.EditText"))';
  static readonly 프로필동작버튼 = 앱id('profile_action_btn');

  static 결과줄(글자: string): string {
    return `android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/title").text(${JSON.stringify(글자)}))`;
  }

  constructor(private readonly driver: AppDriver) {}

  async 열기(): Promise<void> {
    await new 하단탭(this.driver).누르기('둘러보기');
    if (!(await 뜰때까지(this.driver, 검색화면.둘러보기검색창, 15_000))) throw new Error('둘러보기 검색창이 안 보인다');
    await this.driver.$(검색화면.둘러보기검색창).click();
    if (!(await 뜰때까지(this.driver, 검색화면.입력칸, 10_000))) throw new Error('검색 입력 칸이 안 열렸다');
  }

  async 적기(글: string): Promise<void> {
    await 칸에적기(await this.driver.$(검색화면.입력칸).getElement(), 글);
  }

  async 입력값(): Promise<string> {
    return this.driver.$(검색화면.입력칸).getText();
  }

  async 줄보일때까지(글자: string, 시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, 검색화면.결과줄(글자), 시간);
  }

  async 줄누르기(글자: string): Promise<void> {
    if (!(await this.줄보일때까지(글자))) throw new Error(`검색 줄 「${글자}」이 안 보인다`);
    await this.driver.$(검색화면.결과줄(글자)).click();
  }

  async 프로필열기(사용자명: string): Promise<void> {
    await this.열기();
    await this.적기(`@${사용자명}`);
    await this.줄누르기(`@${사용자명}@${서버}로 이동`);
    if (!(await 뜰때까지(this.driver, 검색화면.프로필동작버튼, 20_000))) throw new Error(`${사용자명} 프로필이 안 열렸다`);
  }

  async 주소열기(주소: string): Promise<void> {
    await this.열기();
    await this.적기(주소);
    await this.줄누르기('마스토돈에서 URL 열기');
  }

  static 결과탭(이름: '게시물' | '해시태그' | '사람'): string {
    return `android=new UiSelector().resourceId("org.joinmastodon.android:id/search_tabbar").childSelector(new UiSelector().description(${JSON.stringify(이름)}))`;
  }

  static readonly 결과줄제목들 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/title"))';
  static readonly 결과없음 = 앱id('empty_text');
  static readonly 최근제목 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/title").instance(0))';
  static readonly 모두지우기 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/list").childSelector(new UiSelector().resourceId("org.joinmastodon.android:id/action_btn"))';
  static readonly 입력지우기 = '~모두 지우기';
  static readonly 토스트 = '//android.widget.Toast';

  async 결과탭있나(이름: '게시물' | '해시태그' | '사람', 시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, 검색화면.결과탭(이름), 시간);
  }

  async 결과탭누르기(이름: '게시물' | '해시태그' | '사람'): Promise<void> {
    if (!(await this.결과탭있나(이름))) throw new Error(`검색 결과 「${이름}」 탭이 안 보인다`);
    await this.driver.$(검색화면.결과탭(이름)).click();
  }

  async 결과탭선택됐나(이름: '게시물' | '해시태그' | '사람'): Promise<boolean> {
    return (await this.driver.$(검색화면.결과탭(이름)).getAttribute('selected')) === 'true';
  }

  async 결과줄글들(): Promise<string[]> {
    return 모든글자(this.driver, 검색화면.결과줄제목들);
  }

  async 결과없음글(시간 = 15_000): Promise<string> {
    if (!(await 뜰때까지(this.driver, 검색화면.결과없음, 시간))) return '';
    return this.driver.$(검색화면.결과없음).getText();
  }

  async 최근제목글(시간 = 10_000): Promise<string> {
    if (!(await 뜰때까지(this.driver, 검색화면.최근제목, 시간))) return '';
    return this.driver.$(검색화면.최근제목).getText();
  }

  async 모두지우기있나(시간 = 5_000): Promise<boolean> {
    return 뜰때까지(this.driver, 검색화면.모두지우기, 시간);
  }

  async 모두지우기글(): Promise<string> {
    if (!(await this.모두지우기있나())) return '';
    return this.driver.$(검색화면.모두지우기).getText();
  }

  async 모두지우기누르기(): Promise<void> {
    if (!(await this.모두지우기있나(10_000))) throw new Error('최근 검색 「모두 지우기」가 안 보인다');
    await this.driver.$(검색화면.모두지우기).click();
  }

  async 입력비우기(): Promise<void> {
    await 칸비우기(await this.driver.$(검색화면.입력칸).getElement());
  }

  async 입력지우기누르기(): Promise<void> {
    await this.driver.$(검색화면.입력지우기).click();
  }

  async 입력칸있나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 검색화면.입력칸, 시간);
  }

  async 사람줄있나(사용자명: string, 시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 목록안글자(`@${사용자명}`, 'list'), 시간);
  }

  async 사람줄누르기(사용자명: string): Promise<void> {
    if (!(await this.사람줄있나(사용자명))) throw new Error(`검색 결과에 @${사용자명} 줄이 안 보인다`);
    await this.driver.$(목록안글자(`@${사용자명}`, 'list')).click();
  }

  async 토스트글읽기(시간 = 10_000): Promise<string> {
    return 토스트글읽기(this.driver, 시간);
  }
}
