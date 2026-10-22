import type { CaseBodyArgs } from '@platform/kit';

type 폰 = CaseBodyArgs<unknown, unknown>['driver'];

export class 로그인화면 {
  static readonly 주소 = 'app:.MainActivity/login_id';
  static readonly 앱꾸러미 = 'com.demomarket.app';
  static readonly 기다림 = 15000;

  constructor(private readonly driver: 폰) {}

  get 제목() {
    return this.driver.$('~app_title');
  }

  get 아이디입력칸() {
    return this.driver.$('android=new UiSelector().resourceId("login_id")');
  }

  get 비밀번호입력칸() {
    return this.driver.$('android=new UiSelector().resourceId("login_password")');
  }

  get 로그인버튼() {
    return this.driver.$('android=new UiSelector().resourceId("login_button")');
  }

  get 로그인버튼표시() {
    return this.driver.$('~login_button');
  }

  get 오류문구() {
    return this.driver.$('~login_error');
  }

  async 앱켜기(): Promise<void> {
    await this.driver.activateApp(로그인화면.앱꾸러미);
  }

  async 앱다시켜기(): Promise<void> {
    await this.driver.terminateApp(로그인화면.앱꾸러미);
    await this.driver.activateApp(로그인화면.앱꾸러미);
  }

  async 로그인버튼보일때까지(): Promise<boolean> {
    return this.로그인버튼표시.waitForDisplayed({ timeout: 로그인화면.기다림 }).then(
      () => true,
      () => false,
    );
  }

  async 로그인화면사라질때까지(): Promise<boolean> {
    return this.로그인버튼표시.waitForDisplayed({ timeout: 로그인화면.기다림, reverse: true }).then(
      () => true,
      () => false,
    );
  }

  async 아이디적기(값: string): Promise<void> {
    if (값 === '') await this.아이디입력칸.clearValue();
    else await this.아이디입력칸.setValue(값);
  }

  async 비밀번호적기(값: string): Promise<void> {
    if (값 === '') await this.비밀번호입력칸.clearValue();
    else await this.비밀번호입력칸.setValue(값);
  }

  async 로그인누르기(): Promise<void> {
    await this.로그인버튼.click();
  }

  async 로그인(아이디: string, 비밀번호: string): Promise<void> {
    await this.아이디적기(아이디);
    await this.비밀번호적기(비밀번호);
    await this.로그인누르기();
  }

  async 아이디값(): Promise<string> {
    const 칸 = this.아이디입력칸;
    await this.driver
      .waitUntil(async () => (await 칸.getText()) !== '', { timeout: 로그인화면.기다림 })
      .catch(() => undefined);
    return 칸.getText();
  }

  async 보이는글(요소: ReturnType<폰['$']>): Promise<string> {
    return (await 요소.isDisplayed()) ? 요소.getText() : '';
  }

  async 제목글(): Promise<string> {
    return this.보이는글(this.제목);
  }

  async 아이디칸이름(): Promise<string> {
    return this.보이는글(this.아이디입력칸.$('android.widget.TextView'));
  }

  async 비밀번호칸이름(): Promise<string> {
    return this.보이는글(this.비밀번호입력칸.$('android.widget.TextView'));
  }

  async 로그인버튼글(): Promise<string> {
    return this.보이는글(this.로그인버튼.$('android.widget.TextView'));
  }

  async 비밀번호가림(): Promise<string> {
    return (await this.비밀번호입력칸.getAttribute('password')) ?? '';
  }

  async 로그인버튼눌림(): Promise<string> {
    return (await this.로그인버튼.getAttribute('enabled')) ?? '';
  }

  async 오류글(): Promise<string> {
    const 보임 = await this.오류문구.waitForDisplayed({ timeout: 로그인화면.기다림 }).then(
      () => true,
      () => false,
    );
    return 보임 ? this.오류문구.getText() : '';
  }

  async 오류가입력칸아래인가(): Promise<boolean> {
    if (!(await this.오류문구.isDisplayed())) return false;
    const 오류 = await this.오류문구.getLocation();
    const 칸 = await this.비밀번호입력칸.getLocation();
    const 칸크기 = await this.비밀번호입력칸.getSize();
    return 오류.y >= 칸.y + 칸크기.height;
  }

  async 뒤로가기(): Promise<void> {
    if (await this.driver.isKeyboardShown()) await this.driver.hideKeyboard();
    await this.driver.back();
  }

  async 앱이닫힐때까지(): Promise<boolean> {
    return this.driver
      .waitUntil(async () => (await this.driver.getCurrentPackage()) !== 로그인화면.앱꾸러미, {
        timeout: 로그인화면.기다림,
      })
      .then(
        () => true,
        () => false,
      );
  }
}
