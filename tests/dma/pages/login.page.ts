import { type 앱, 칸에적기 } from '../helpers/app.helper.js';

export class 로그인화면 {
  static readonly 주소 = 'app:.MainActivity/login_id';

  constructor(private readonly driver: 앱) {}

  get 제목() {
    return this.driver.$('id=app_title');
  }

  get 아이디칸() {
    return this.driver.$('id=login_id');
  }

  get 비밀번호칸() {
    return this.driver.$('id=login_password');
  }

  get 로그인버튼() {
    return this.driver.$('id=login_button');
  }

  get 오류글() {
    return this.driver.$('id=login_error');
  }

  async 열릴때까지(timeout = 30000): Promise<void> {
    await this.로그인버튼.waitForDisplayed({ timeout });
  }

  async 보이나(): Promise<boolean> {
    return this.로그인버튼.isDisplayed();
  }

  async 제목글(): Promise<string> {
    return this.제목.getText();
  }

  async 아이디칸이름(): Promise<string> {
    return this.아이디칸.$('android.widget.TextView').getText();
  }

  async 비밀번호칸이름(): Promise<string> {
    return this.비밀번호칸.$('android.widget.TextView').getText();
  }

  async 아이디적기(값: string): Promise<void> {
    await 칸에적기(this.driver, await this.아이디칸.getElement(), 값);
  }

  async 비밀번호적기(값: string): Promise<void> {
    await 칸에적기(this.driver, await this.비밀번호칸.getElement(), 값);
  }

  async 아이디칸글(): Promise<string> {
    return this.아이디칸.getText();
  }

  async 비밀번호가려지나(): Promise<boolean> {
    return (await this.비밀번호칸.getAttribute('password')) === 'true';
  }

  async 로그인누르기(): Promise<void> {
    await this.로그인버튼.click();
  }

  async 로그인(아이디: string, 비밀번호: string): Promise<void> {
    await this.아이디적기(아이디);
    await this.비밀번호적기(비밀번호);
    await this.로그인누르기();
  }

  async 로그인버튼눌리나(): Promise<boolean> {
    return this.로그인버튼.isEnabled();
  }

  async 오류글뜰때까지(timeout = 15000): Promise<void> {
    await this.오류글.waitForDisplayed({ timeout });
  }

  async 오류글읽기(): Promise<string> {
    await this.오류글뜰때까지();
    return this.오류글.getText();
  }

  async 오류글이입력칸아래인가(): Promise<boolean> {
    const 오류 = await this.오류글.getLocation();
    const 칸 = await this.비밀번호칸.getLocation();
    return 오류.y > 칸.y;
  }
}
