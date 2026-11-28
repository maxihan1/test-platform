import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지, 보이나 } from '@platform/kit/parts';

import { 하단탭 } from '../components/tabbar.component.js';
import { 꾸러미, 모든글자, 앱id } from '../helpers/app.helper.js';

export type 둘러보기탭 = '게시물' | '해시태그' | '소식' | '추천';

export class 둘러보기화면 {
  static readonly 주소 = 'app:.MainActivity/게시물';
  static readonly 검색창 = 앱id('search_text');
  static readonly QR스캔 = 앱id('search_scan_qr');
  static readonly 탭줄 = `android=new UiSelector().resourceId("${꾸러미}:id/tabbar").className("android.widget.HorizontalScrollView")`;
  static readonly 안내 = 앱id('banner_text');
  static readonly 빈글 = 앱id('empty_text');
  static readonly 오류글 = 앱id('error_text');
  static readonly 유행글본문들 = `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().resourceId("${꾸러미}:id/text"))`;
  static readonly 해시태그제목들 = `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().resourceId("${꾸러미}:id/title"))`;
  static readonly 해시태그설명들 = `android=new UiSelector().resourceId("${꾸러미}:id/list").childSelector(new UiSelector().resourceId("${꾸러미}:id/subtitle"))`;

  static 탭(이름: 둘러보기탭): string {
    return `~${이름}`;
  }

  constructor(private readonly driver: AppDriver) {}

  async 열기(): Promise<void> {
    await new 하단탭(this.driver).누르기('둘러보기');
    if (!(await 뜰때까지(this.driver, 둘러보기화면.검색창, 15_000))) throw new Error('둘러보기 검색창이 안 보인다');
  }

  async 떴나(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, 둘러보기화면.검색창, 시간);
  }

  async 검색창글(): Promise<string> {
    if (!(await this.떴나())) return '';
    return this.driver.$(둘러보기화면.검색창).getText();
  }

  async 검색창누르기(): Promise<void> {
    if (!(await this.떴나())) throw new Error('둘러보기 검색창이 안 보인다');
    await this.driver.$(둘러보기화면.검색창).click();
  }

  async QR스캔있나(시간 = 3_000): Promise<boolean> {
    return 뜰때까지(this.driver, 둘러보기화면.QR스캔, 시간);
  }

  async QR스캔누르기(): Promise<void> {
    if (!(await this.QR스캔있나(10_000))) throw new Error('둘러보기 「QR 코드 스캔」 아이콘이 안 보인다');
    await this.driver.$(둘러보기화면.QR스캔).click();
  }

  async 탭있나(이름: 둘러보기탭, 시간 = 5_000): Promise<boolean> {
    return 뜰때까지(this.driver, 둘러보기화면.탭(이름), 시간);
  }

  async 탭누르기(이름: 둘러보기탭): Promise<void> {
    if (!(await this.탭있나(이름, 10_000))) throw new Error(`둘러보기 「${이름}」 탭이 안 보인다`);
    await this.driver.$(둘러보기화면.탭(이름)).click();
  }

  async 탭선택됐나(이름: 둘러보기탭): Promise<boolean> {
    return (await this.driver.$(둘러보기화면.탭(이름)).getAttribute('selected')) === 'true';
  }

  async 안내글(시간 = 15_000): Promise<string> {
    if (!(await 뜰때까지(this.driver, 둘러보기화면.안내, 시간))) return '';
    return this.driver.$(둘러보기화면.안내).getText();
  }

  async 빈글읽기(시간 = 15_000): Promise<string> {
    if (!(await 뜰때까지(this.driver, 둘러보기화면.빈글, 시간))) return '';
    return this.driver.$(둘러보기화면.빈글).getText();
  }

  async 오류글읽기(시간 = 3_000): Promise<string> {
    if (!(await 뜰때까지(this.driver, 둘러보기화면.오류글, 시간))) return '';
    return this.driver.$(둘러보기화면.오류글).getText();
  }

  async 유행글있나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 둘러보기화면.유행글본문들, 시간);
  }

  async 유행글수(): Promise<number> {
    return (await 모든글자(this.driver, 둘러보기화면.유행글본문들)).length;
  }

  async 해시태그제목글들(): Promise<string[]> {
    return 모든글자(this.driver, 둘러보기화면.해시태그제목들);
  }

  async 해시태그설명글들(): Promise<string[]> {
    return 모든글자(this.driver, 둘러보기화면.해시태그설명들);
  }

  async 카메라권한창뜨나(): Promise<boolean> {
    return 보이나(this.driver, 'id=com.android.permissioncontroller:id/permission_message');
  }
}
