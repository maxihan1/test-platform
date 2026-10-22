import type { CaseBodyArgs } from '@platform/kit';

type 앱 = CaseBodyArgs<unknown, unknown>['driver'];

export class 로그인화면 {
  static readonly 주소 = 'app:.MainActivity/login_id';
  static readonly 앱번호 = 'com.demomarket.app';

  constructor(private readonly driver: 앱) {}

  get 제목() {
    return this.driver.$('~app_title');
  }

  get 아이디칸() {
    return this.driver.$('id=login_id');
  }

  get 아이디칸안내() {
    return this.driver.$('id=login_id').$('android.widget.TextView');
  }

  get 비밀번호칸() {
    return this.driver.$('id=login_password');
  }

  get 비밀번호칸안내() {
    return this.driver.$('id=login_password').$('android.widget.TextView');
  }

  get 로그인버튼() {
    return this.driver.$('~login_button');
  }

  get 로그인버튼틀() {
    return this.driver.$('id=login_button');
  }

  get 로그인버튼글자() {
    return this.driver.$('id=login_button').$('android.widget.TextView');
  }

  get 오류() {
    return this.driver.$('~login_error');
  }

  async 열릴때까지(): Promise<boolean> {
    return this.로그인버튼.waitForDisplayed({ timeout: 30_000 }).then(
      () => true,
      () => false,
    );
  }

  async 제목이보일때까지(): Promise<void> {
    await this.제목.waitForDisplayed({ timeout: 30_000 });
  }

  async 아이디적기(값: string): Promise<void> {
    if (값 === '') await this.아이디칸.clearValue();
    else await this.아이디칸.setValue(값);
  }

  async 비밀번호적기(값: string): Promise<void> {
    if (값 === '') await this.비밀번호칸.clearValue();
    else await this.비밀번호칸.setValue(값);
  }

  async 로그인누르기(): Promise<void> {
    await this.로그인버튼.click();
  }

  async 로그인(아이디: string, 비밀번호: string): Promise<void> {
    await this.아이디적기(아이디);
    await this.비밀번호적기(비밀번호);
    await this.로그인누르기();
  }

  async 오류글(): Promise<string> {
    await this.오류.waitForDisplayed({ timeout: 30_000 });
    return this.오류.getText();
  }

  async 닫힐때까지(): Promise<boolean> {
    return this.로그인버튼.waitForDisplayed({ reverse: true, timeout: 30_000 }).then(
      () => true,
      () => false,
    );
  }

  async 뒤로가기(): Promise<void> {
    await this.driver.back();
  }

  async 앱이닫힐때까지(): Promise<boolean> {
    return this.driver
      .waitUntil(async () => (await this.driver.queryAppState(로그인화면.앱번호)) !== 4, { timeout: 15_000 })
      .then(
        () => true,
        () => false,
      );
  }

  async 앱켜기(): Promise<void> {
    await this.driver.activateApp(로그인화면.앱번호);
  }

  async 앱다시켜기(): Promise<void> {
    await this.driver.terminateApp(로그인화면.앱번호);
    await this.driver.activateApp(로그인화면.앱번호);
  }
}
