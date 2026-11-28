import type { AppDriver } from '@platform/kit/app';
import { 칸비우기, 칸에적기, 뜰때까지 } from '@platform/kit/parts';

import { 꾸러미, 목록안글자포함, 앱id } from '../helpers/app.helper.js';

export class 이름편집화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 칸 = 앱id('edit');
  static readonly 위막대제목 = `android=new UiSelector().resourceId("${꾸러미}:id/toolbar").childSelector(new UiSelector().className("android.widget.TextView"))`;
  static readonly 저장 = `android=new UiSelector().resourceId("${꾸러미}:id/toolbar").childSelector(new UiSelector().className("android.widget.Button"))`;
  static readonly 글자수안내 = 목록안글자포함('characters maximum', 'appkit_content');

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 이름편집화면.칸, 시간);
  }

  async 위막대제목글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 이름편집화면.위막대제목, 10_000))) return '';
    return this.driver.$(이름편집화면.위막대제목).getText();
  }

  async 값(): Promise<string> {
    if (!(await this.떴나())) return '';
    return this.driver.$(이름편집화면.칸).getText();
  }

  async 적기(글: string): Promise<void> {
    if (!(await this.떴나())) throw new Error('이름 편집 칸이 안 보인다');
    await 칸에적기(await this.driver.$(이름편집화면.칸).getElement(), 글);
  }

  async 비우기(): Promise<void> {
    if (!(await this.떴나())) throw new Error('이름 편집 칸이 안 보인다');
    await 칸비우기(await this.driver.$(이름편집화면.칸).getElement());
  }

  async 글자수안내글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 이름편집화면.글자수안내, 5_000))) return '';
    return this.driver.$(이름편집화면.글자수안내).getText();
  }

  async 저장켜져있나(): Promise<boolean> {
    if (!(await 뜰때까지(this.driver, 이름편집화면.저장, 5_000))) return false;
    return (await this.driver.$(이름편집화면.저장).getAttribute('enabled')) === 'true';
  }

  async 저장글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 이름편집화면.저장, 5_000))) return '';
    return this.driver.$(이름편집화면.저장).getText();
  }

  async 저장글될때까지(글자: string, 시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 목록안글자포함(글자, 'toolbar'), 시간);
  }

  async 저장누르기(): Promise<void> {
    if (!(await 뜰때까지(this.driver, 이름편집화면.저장, 5_000))) throw new Error('이름 편집 「저장」이 안 보인다');
    await this.driver.$(이름편집화면.저장).click();
  }
}
