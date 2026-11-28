import type { AppDriver } from '@platform/kit/app';
import { 될때까지, 보이나, 칸에적기, 키보드완료, 뜰때까지, type 앱요소 } from '@platform/kit/parts';

import { 꾸러미, 모든글자, 모든요소, 앱id, 토스트글읽기 } from '../helpers/app.helper.js';

export type 가입칸 = '이름' | '사용자명' | '이메일' | '암호' | '암호 확인';

const 칸id: Record<가입칸, string> = { 이름: 'display_name', 사용자명: 'username', 이메일: 'email', 암호: 'password', '암호 확인': 'password_confirm' };
const 모든칸: 가입칸[] = ['이름', '사용자명', '이메일', '암호', '암호 확인'];

export class 가입양식 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 제목 = `android=new UiSelector().resourceId("${꾸러미}:id/toolbar").childSelector(new UiSelector().text("계정 만들기"))`;
  static readonly 사용자명뒤 = 앱id('domain');
  static readonly 사유칸 = `android=new UiSelector().resourceId("${꾸러미}:id/reason_wrap").childSelector(new UiSelector().className("android.widget.EditText"))`;
  static readonly 양식글들 = `android=new UiSelector().resourceId("${꾸러미}:id/scroller").childSelector(new UiSelector().className("android.widget.TextView"))`;
  static readonly 입력칸들 = `android=new UiSelector().resourceId("${꾸러미}:id/scroller").childSelector(new UiSelector().className("android.widget.EditText"))`;
  static readonly 다음버튼 = 앱id('btn_next');
  static readonly 상위버튼 = '~상위 메뉴로 이동';
  static readonly 토스트상자 = '//android.widget.Toast';

  static 칸(이름: 가입칸): string {
    return 앱id(칸id[이름]);
  }

  static 칸틀(이름: 가입칸): string {
    return 앱id(`${칸id[이름]}_wrap`);
  }

  static 칸안글들(이름: 가입칸): string {
    return `android=new UiSelector().resourceId("${꾸러미}:id/${칸id[이름]}_wrap").childSelector(new UiSelector().className("android.widget.TextView"))`;
  }

  static 굴려서(id: string): string {
    return `android=new UiScrollable(new UiSelector().resourceId("${꾸러미}:id/scroller")).scrollIntoView(new UiSelector().resourceId("${꾸러미}:id/${id}"))`;
  }

  constructor(private readonly driver: AppDriver) {}

  async 떴나(시간 = 30_000): Promise<boolean> {
    return 뜰때까지(this.driver, 가입양식.제목, 시간);
  }

  async 제목글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 가입양식.제목, 10_000))) return '';
    return this.driver.$(가입양식.제목).getText();
  }

  async 칸있나(이름: 가입칸): Promise<boolean> {
    return (await 보이나(this.driver, 가입양식.칸(이름))) || (await this.driver.$(가입양식.굴려서(칸id[이름])).isExisting());
  }

  async 입력칸수(): Promise<number> {
    return (await 모든요소(this.driver, 가입양식.입력칸들)).length;
  }

  async 사유칸있나(): Promise<boolean> {
    return 보이나(this.driver, 가입양식.사유칸);
  }

  async 사용자명뒤글(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 가입양식.사용자명뒤, 10_000))) return '';
    return this.driver.$(가입양식.사용자명뒤).getText();
  }

  async 적기(이름: 가입칸, 값: string): Promise<void> {
    await 칸에적기(await this.칸요소(이름), 값);
  }

  async 칸글(이름: 가입칸): Promise<string> {
    return (await this.칸요소(이름)).getText();
  }

  async 칸글들(): Promise<string[]> {
    return 모든글자(this.driver, 가입양식.입력칸들);
  }

  async 포커스주기(이름: 가입칸): Promise<void> {
    await (await this.칸요소(이름)).click();
  }

  async 포커스칸인가(이름: 가입칸): Promise<boolean> {
    return (await (await this.칸요소(이름)).getAttribute('focused')) === 'true';
  }

  async 칸오류글(이름: 가입칸, 시간 = 10_000): Promise<string> {
    let 글 = '';
    await 될때까지(
      this.driver,
      async () => {
        글 = (await this.오류글들(이름)).join(' ');
        return 글 !== '';
      },
      시간,
    );
    return 글;
  }

  async 오류글들(이름: 가입칸): Promise<string[]> {
    if (await this.driver.isKeyboardShown()) await this.driver.hideKeyboard();
    await this.driver.$(가입양식.굴려서(`${칸id[이름]}_wrap`)).isExisting();
    const 글칸들 = await 모든요소(this.driver, 가입양식.칸안글들(이름));
    const 오류: string[] = [];
    for (const 글칸 of 글칸들) {
      const id = (await 글칸.getAttribute('resource-id')) ?? '';
      const 글 = await 글칸.getText();
      if ((id === '' || id === 'null') && 글 !== 이름) 오류.push(글);
    }
    return 오류;
  }

  async 모든오류글(): Promise<string[]> {
    if (await this.driver.isKeyboardShown()) await this.driver.hideKeyboard();
    const 오류: string[] = [];
    for (const 글칸 of await 모든요소(this.driver, 가입양식.양식글들)) {
      const id = (await 글칸.getAttribute('resource-id')) ?? '';
      const 글 = await 글칸.getText();
      if ((id === '' || id === 'null') && !(모든칸 as string[]).includes(글)) 오류.push(글);
    }
    return 오류;
  }

  async 다음보이나(): Promise<boolean> {
    return 보이나(this.driver, 가입양식.다음버튼);
  }

  async 다음켜졌나(): Promise<boolean> {
    return (await this.driver.$(가입양식.다음버튼).getAttribute('enabled')) === 'true';
  }

  async 다음켜질때까지(시간 = 10_000): Promise<boolean> {
    return 될때까지(this.driver, () => this.다음켜졌나(), 시간);
  }

  async 다음글(): Promise<string> {
    return this.driver.$(가입양식.다음버튼).getText();
  }

  async 다음누르기(): Promise<void> {
    if (!(await 뜰때까지(this.driver, 가입양식.다음버튼, 10_000))) throw new Error('가입 양식 「다음」이 안 보인다');
    await this.driver.$(가입양식.다음버튼).click();
  }

  async 키보드내리기(): Promise<void> {
    await 키보드완료(this.driver);
  }

  async 토스트(시간 = 10_000): Promise<string> {
    return 토스트글읽기(this.driver, 시간);
  }

  async 상위누르기(): Promise<void> {
    await this.driver.$(가입양식.상위버튼).click();
  }

  private async 칸요소(이름: 가입칸): Promise<앱요소> {
    const 주소 = 가입양식.칸(이름);
    if (await 보이나(this.driver, 주소)) return this.driver.$(주소).getElement();
    return this.driver.$(가입양식.굴려서(칸id[이름])).getElement();
  }
}
