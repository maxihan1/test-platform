import type { CaseBodyArgs } from '@platform/kit';

type 드라이버 = CaseBodyArgs<unknown, unknown>['driver'];

export class 로그인화면 {
  static readonly 주소 = 'app:.MainActivity/login_id';

  constructor(private readonly driver: 드라이버) {}

  get 제목() {
    return this.driver.$('~app_title');
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

  get 안내() {
    return this.driver.$('~login_error');
  }

  async 열려있나(): Promise<boolean> {
    return this.아이디칸.waitForDisplayed({ timeout: 20_000 }).then(
      () => true,
      () => false,
    );
  }

  async 닫혔나(): Promise<boolean> {
    return this.아이디칸.waitForDisplayed({ timeout: 30_000, reverse: true }).then(
      () => true,
      () => false,
    );
  }

  async 아이디적기(값: string): Promise<void> {
    await this.아이디칸.waitForDisplayed();
    await this.아이디칸.setValue(값);
  }

  async 비밀번호적기(값: string): Promise<void> {
    await this.비밀번호칸.waitForDisplayed();
    await this.비밀번호칸.setValue(값);
  }

  async 로그인누르기(): Promise<void> {
    await this.driver.$('~login_button').click();
  }

  async 로그인하기(아이디: string, 비밀번호: string): Promise<void> {
    await this.아이디적기(아이디);
    await this.비밀번호적기(비밀번호);
    await this.로그인누르기();
  }

  async 안내글(): Promise<string> {
    const 보임 = await this.안내.waitForDisplayed({ timeout: 30_000 }).then(
      () => true,
      () => false,
    );
    return 보임 ? this.안내.getText() : '';
  }
}
