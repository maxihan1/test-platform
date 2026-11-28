import type { AppDriver } from '@platform/kit/app';
import { 길게누르기, 뜰때까지, 사라질때까지, 칸에적기 } from '@platform/kit/parts';

import { 확인창 } from '../components/dialog.component.js';
import { 꾸러미, 앱id } from '../helpers/app.helper.js';
import { 툴바글자 } from '../helpers/system-ui.helper.js';

export class 필터범위화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 제목 = 툴바글자('를 뮤트');

  static 항목(글자: string): string {
    return `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().resourceId("${꾸러미}:id/title").text(${JSON.stringify(글자)}))`;
  }

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 필터범위화면.제목, 시간);
  }

  async 항목누르기(글자: string): Promise<void> {
    if (!(await 뜰때까지(this.driver, 필터범위화면.항목(글자), 10_000))) throw new Error(`필터 범위 「${글자}」 줄이 안 보인다`);
    await this.driver.$(필터범위화면.항목(글자)).click();
  }

  async 닫기(): Promise<void> {
    await this.driver.back();
    await 사라질때까지(this.driver, 필터범위화면.제목, 10_000);
  }
}

export class 뮤트단어화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 제목 = 툴바글자('뮤트된 단어');
  static readonly 단어추가 = `android=new UiSelector().resourceId("${꾸러미}:id/fab").text("단어 추가")`;
  static readonly 옵션 = '~옵션 더보기';
  static readonly 삭제 = 앱id('delete');
  static readonly 선택수 = 'id=android:id/action_bar_title';
  static readonly 창제목 = `android=new UiSelector().resourceId("${꾸러미}:id/title").text("뮤트할 단어 추가")`;
  static readonly 창칸 = `android=new UiSelector().className("android.widget.EditText").resourceId("${꾸러미}:id/edit")`;
  static readonly 도움말 = 앱id('help');
  static readonly 도움말글 = 앱id('help_text');
  static readonly 창추가 = 'id=android:id/button1';
  static readonly 창취소 = 'id=android:id/button2';

  static 단어줄(글자: string): string {
    return `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().resourceId("${꾸러미}:id/title").text(${JSON.stringify(글자)}))`;
  }

  static 창안글(글자: string): string {
    return `android=new UiSelector().className("android.widget.TextView").text(${JSON.stringify(글자)})`;
  }

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 뮤트단어화면.제목, 시간);
  }

  async 단어추가창열기(): Promise<void> {
    if (!(await 뜰때까지(this.driver, 뮤트단어화면.단어추가, 10_000))) throw new Error('「단어 추가」 버튼이 안 보인다');
    await this.driver.$(뮤트단어화면.단어추가).click();
    if (!(await 뜰때까지(this.driver, 뮤트단어화면.창제목, 10_000))) throw new Error('「뮤트할 단어 추가」 창이 안 떴다');
  }

  async 창제목있나(시간 = 5_000): Promise<boolean> {
    return 뜰때까지(this.driver, 뮤트단어화면.창제목, 시간);
  }

  async 창에적기(글: string): Promise<void> {
    await 칸에적기(await this.driver.$(뮤트단어화면.창칸).getElement(), 글);
  }

  async 도움말누르기(): Promise<void> {
    await this.driver.$(뮤트단어화면.도움말).click();
  }

  async 도움말글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 뮤트단어화면.도움말글, 5_000))) return '';
    return this.driver.$(뮤트단어화면.도움말글).getText();
  }

  async 창추가누르기(): Promise<void> {
    await this.driver.$(뮤트단어화면.창추가).click();
  }

  async 창취소누르기(): Promise<void> {
    await this.driver.$(뮤트단어화면.창취소).click();
    await 사라질때까지(this.driver, 뮤트단어화면.창제목, 5_000);
  }

  async 창에글있나(글자: string, 시간 = 5_000): Promise<boolean> {
    return 뜰때까지(this.driver, 뮤트단어화면.창안글(글자), 시간);
  }

  async 단어줄있나(글자: string, 시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 뮤트단어화면.단어줄(글자), 시간);
  }

  async 단어더하기(글자: string): Promise<void> {
    await this.단어추가창열기();
    await this.창에적기(글자);
    await this.창추가누르기();
    if (!(await this.단어줄있나(글자))) throw new Error(`뮤트된 단어 「${글자}」 줄이 안 생겼다`);
  }

  async 선택모드켜기(): Promise<void> {
    await this.driver.$(뮤트단어화면.옵션).click();
    const 선택 = 'android=new UiSelector().resourceId("android:id/title").text("선택")';
    if (!(await 뜰때까지(this.driver, 선택, 5_000))) throw new Error('뮤트된 단어 옵션 메뉴에 「선택」이 안 보인다');
    await this.driver.$(선택).click();
    if (!(await 뜰때까지(this.driver, 뮤트단어화면.선택수, 5_000))) throw new Error('뮤트된 단어 선택 모드가 안 켜졌다');
  }

  async 단어고르기(글자: string): Promise<void> {
    await this.driver.$(뮤트단어화면.단어줄(글자)).click();
  }

  async 단어길게누르기(글자: string): Promise<void> {
    await 길게누르기(this.driver, 뮤트단어화면.단어줄(글자));
  }

  async 삭제누르기(): Promise<void> {
    await this.driver.$(뮤트단어화면.삭제).click();
  }

  삭제확인창(): 확인창 {
    return new 확인창(this.driver);
  }

  async 닫기(): Promise<void> {
    await this.driver.back();
    await 사라질때까지(this.driver, 뮤트단어화면.제목, 10_000);
  }
}
