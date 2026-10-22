import { 기다림, 눌리는가, 입력칸, type 앱 } from '../helpers/app.helper.js';

export class 로그인화면 {
  static readonly 주소 = 'app:.MainActivity/login_id';

  constructor(private readonly driver: 앱) {}

  get 제목() {
    return this.driver.$('~app_title');
  }

  get 아이디칸() {
    return this.driver.$(입력칸('login_id'));
  }

  get 비밀번호칸() {
    return this.driver.$(입력칸('login_password'));
  }

  get 아이디칸이름() {
    return this.driver.$(`${입력칸('login_id')}/android.widget.TextView`);
  }

  get 비밀번호칸이름() {
    return this.driver.$(`${입력칸('login_password')}/android.widget.TextView`);
  }

  get 로그인버튼() {
    return this.driver.$('~login_button');
  }

  get 로그인버튼글() {
    return this.driver.$('//android.view.View[@resource-id="login_button"]//android.widget.TextView');
  }

  get 오류() {
    return this.driver.$('~login_error');
  }

  async 열릴때까지(시간 = 기다림 * 2): Promise<boolean> {
    return this.로그인버튼.waitForDisplayed({ timeout: 시간 }).then(() => true, () => false);
  }

  async 보이는가(): Promise<boolean> {
    return this.로그인버튼.isDisplayed().catch(() => false);
  }

  async 적기(아이디: string, 비밀번호: string): Promise<void> {
    if (아이디 === '') await this.아이디칸.clearValue();
    else await this.아이디칸.setValue(아이디);
    if (비밀번호 === '') await this.비밀번호칸.clearValue();
    else await this.비밀번호칸.setValue(비밀번호);
  }

  async 로그인누르기(): Promise<void> {
    await this.로그인버튼.click();
  }

  async 로그인(아이디: string, 비밀번호: string): Promise<void> {
    await this.적기(아이디, 비밀번호);
    await this.로그인누르기();
  }

  async 오류글(): Promise<string> {
    await this.오류.waitForDisplayed({ timeout: 기다림 });
    return this.오류.getText();
  }

  async 아이디칸글(): Promise<string> {
    return this.아이디칸.getText();
  }

  async 비밀번호가려졌나(): Promise<boolean> {
    return (await this.비밀번호칸.getAttribute('password')) === 'true';
  }

  async 제목나올때까지(시간 = 기다림 * 2): Promise<boolean> {
    return this.제목.waitForDisplayed({ timeout: 시간 }).then(() => true, () => false);
  }

  async 제목글(): Promise<string> {
    return this.제목.getText();
  }

  async 아이디칸이름글(): Promise<string> {
    return this.아이디칸이름.getText();
  }

  async 비밀번호칸이름글(): Promise<string> {
    return this.비밀번호칸이름.getText();
  }

  async 로그인버튼이름글(): Promise<string> {
    return this.로그인버튼글.getText();
  }

  async 로그인버튼눌리나(): Promise<boolean> {
    return 눌리는가(this.driver, 'login_button');
  }

  async 아이디적기(글: string): Promise<void> {
    await this.아이디칸.setValue(글);
  }

  async 아이디칸에글나올때까지(시간 = 기다림): Promise<boolean> {
    return this.driver
      .waitUntil(async () => (await this.아이디칸.getText().catch(() => '')).length > 0, { timeout: 시간 })
      .then(() => true, () => false);
  }
}
