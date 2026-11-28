import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지, 스크롤해서찾기 } from '@platform/kit/parts';

import { 펼친메뉴 } from '../components/popup-menu.component.js';
import { 꾸러미, 모든글자, 모든요소, 앱id } from '../helpers/app.helper.js';

export class 컬렉션화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 구간제목 = `android=new UiSelector().resourceId("${꾸러미}:id/title").text("Collections")`;
  static readonly 공유 = 앱id('share');
  static readonly 계정사용자명들 = `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().resourceId("${꾸러미}:id/username"))`;
  static readonly 위막대제목 = `android=new UiSelector().resourceId("${꾸러미}:id/toolbar").childSelector(new UiSelector().className("android.widget.TextView").instance(0))`;
  static readonly 위막대작성자 = `android=new UiSelector().resourceId("${꾸러미}:id/toolbar").childSelector(new UiSelector().className("android.widget.TextView").instance(1))`;

  static 안내글(글자: string): string {
    return `android=new UiSelector().text(${JSON.stringify(글자)})`;
  }

  static 컬렉션제목(이름: string): string {
    return `android=new UiSelector().resourceId("${꾸러미}:id/title").text(${JSON.stringify(이름)})`;
  }

  readonly 메뉴: 펼친메뉴;

  constructor(private readonly driver: AppDriver) {
    this.메뉴 = new 펼친메뉴(driver);
  }

  async 구간있나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 컬렉션화면.구간제목, 시간);
  }

  async 컬렉션찾기(이름: string): Promise<boolean> {
    if (await 뜰때까지(this.driver, 컬렉션화면.컬렉션제목(이름), 3_000)) return true;
    try {
      await 스크롤해서찾기(this.driver, 이름);
      return true;
    } catch {
      return false;
    }
  }

  async 빈안내있나(글자: string, 시간 = 10_000): Promise<boolean> {
    if (await 뜰때까지(this.driver, 컬렉션화면.안내글(글자), 3_000)) return true;
    try {
      await 스크롤해서찾기(this.driver, 글자);
    } catch {
      return false;
    }
    return 뜰때까지(this.driver, 컬렉션화면.안내글(글자), 시간);
  }

  async 작성자글(이름: string): Promise<string> {
    const 제목y = (await this.driver.$(컬렉션화면.컬렉션제목(이름)).getLocation()).y;
    for (const 요소 of await 모든요소(this.driver, 앱id('author'))) {
      const 간격 = (await 요소.getLocation()).y - 제목y;
      if (간격 > 0 && 간격 < 120) return 요소.getText();
    }
    return '';
  }

  async 컬렉션열기(이름: string): Promise<void> {
    if (!(await this.컬렉션찾기(이름))) throw new Error(`컬렉션 「${이름}」이 안 보인다`);
    await this.driver.$(컬렉션화면.컬렉션제목(이름)).click();
  }

  async 떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 컬렉션화면.공유, 시간);
  }

  async 제목글(): Promise<string> {
    return this.driver.$(컬렉션화면.위막대제목).getText();
  }

  async 작성자줄글(): Promise<string> {
    return this.driver.$(컬렉션화면.위막대작성자).getText();
  }

  async 계정글들(): Promise<string[]> {
    return 모든글자(this.driver, 컬렉션화면.계정사용자명들);
  }

  async 메뉴열기(): Promise<void> {
    await this.driver.$('~옵션 더보기').click();
  }

  async 뒤로(): Promise<void> {
    await this.driver.$('~뒤로 가기').click();
  }
}
