import type { AppDriver } from '@platform/kit/app';
import { 끌어놓기, 칸에적기, 뜰때까지 } from '@platform/kit/parts';

import { 꾸러미, 모든글자, 앱id } from '../helpers/app.helper.js';

export class 항목목록화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 제목 = `android=new UiSelector().resourceId("${꾸러미}:id/toolbar").childSelector(new UiSelector().text("Custom fields"))`;
  static readonly 항목추가 = 앱id('add');
  static readonly 라벨들 = `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().resourceId("${꾸러미}:id/title"))`;
  static readonly 값들 = `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().resourceId("${꾸러미}:id/value"))`;

  static 몇째(id: 'edit' | 'dragger_thingy', 차례: number): string {
    return `android=new UiSelector().resourceId("${꾸러미}:id/${id}").instance(${String(차례)})`;
  }

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 항목목록화면.제목, 시간);
  }

  async 라벨글들(): Promise<string[]> {
    return 모든글자(this.driver, 항목목록화면.라벨들);
  }

  async 항목추가있나(시간 = 3_000): Promise<boolean> {
    return 뜰때까지(this.driver, 항목목록화면.항목추가, 시간);
  }

  async 항목추가누르기(): Promise<void> {
    await this.driver.$(항목목록화면.항목추가).click();
  }

  private async 차례(라벨: string): Promise<number> {
    const 글 = await this.라벨글들();
    const i = 글.indexOf(라벨);
    if (i < 0) throw new Error(`프로필 항목 「${라벨}」이 없다`);
    return i;
  }

  async 편집누르기(라벨: string): Promise<void> {
    await this.driver.$(항목목록화면.몇째('edit', await this.차례(라벨))).click();
  }

  async 끌어옮기기(집을라벨: string, 놓을라벨: string): Promise<void> {
    await 끌어놓기(this.driver, 항목목록화면.몇째('dragger_thingy', await this.차례(집을라벨)), 항목목록화면.몇째('dragger_thingy', await this.차례(놓을라벨)));
  }

  async 뒤로(): Promise<void> {
    await this.driver.$('~상위 메뉴로 이동').click();
  }
}

export class 항목편집화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 라벨칸 = 앱id('label');
  static readonly 내용칸 = 앱id('value');
  static readonly 삭제 = 앱id('delete');
  static readonly 저장 = `android=new UiSelector().resourceId("${꾸러미}:id/toolbar").childSelector(new UiSelector().className("android.widget.Button"))`;
  static readonly 추가제목 = `android=new UiSelector().resourceId("${꾸러미}:id/toolbar").childSelector(new UiSelector().text("Add field"))`;
  static readonly 편집제목 = `android=new UiSelector().resourceId("${꾸러미}:id/toolbar").childSelector(new UiSelector().text("Edit field"))`;
  static readonly 라벨예시 = `android=new UiSelector().resourceId("${꾸러미}:id/label_wrap").childSelector(new UiSelector().textStartsWith("E.g."))`;
  static readonly 내용예시 = `android=new UiSelector().resourceId("${꾸러미}:id/value_wrap").childSelector(new UiSelector().textStartsWith("E.g."))`;

  constructor(private readonly driver: AppDriver) {}

  async 추가화면떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 항목편집화면.추가제목, 시간);
  }

  async 편집화면떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 항목편집화면.편집제목, 시간);
  }

  async 라벨적기(글: string): Promise<void> {
    await 칸에적기(await this.driver.$(항목편집화면.라벨칸).getElement(), 글);
  }

  async 내용적기(글: string): Promise<void> {
    await 칸에적기(await this.driver.$(항목편집화면.내용칸).getElement(), 글);
  }

  async 라벨값(): Promise<string> {
    return this.driver.$(항목편집화면.라벨칸).getText();
  }

  async 예시글들(): Promise<string[]> {
    const 라벨 = (await 뜰때까지(this.driver, 항목편집화면.라벨예시, 3_000)) ? await this.driver.$(항목편집화면.라벨예시).getText() : '';
    const 내용 = (await 뜰때까지(this.driver, 항목편집화면.내용예시, 3_000)) ? await this.driver.$(항목편집화면.내용예시).getText() : '';
    return [라벨, 내용];
  }

  async 저장켜져있나(): Promise<boolean> {
    return (await this.driver.$(항목편집화면.저장).getAttribute('enabled')) === 'true';
  }

  async 저장누르기(): Promise<void> {
    await this.driver.$(항목편집화면.저장).click();
  }

  async 삭제누르기(): Promise<void> {
    await this.driver.$(항목편집화면.삭제).click();
  }

  async 뒤로(): Promise<void> {
    await this.driver.$('~뒤로 가기').click();
  }
}
