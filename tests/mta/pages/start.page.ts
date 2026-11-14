import { 멈춤기다림끄기, 문구가보이나, 문구식, 보이나, 뜰때까지, 앱id, type 앱 } from '../helpers/app.helper.js';

export class 시작화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 기본서버가입 = 앱id('btn_join_default_server');
  readonly 다른서버선택 = 앱id('btn_get_started');
  readonly 더알아보기 = 앱id('btn_learn_more');
  readonly 로그인 = 앱id('btn_log_in');

  constructor(private readonly driver: 앱) {}

  async 떴나(시간 = 60_000): Promise<boolean> {
    await 멈춤기다림끄기(this.driver);
    return 뜰때까지(this.driver, this.로그인, 시간);
  }

  async 누르기(버튼: '기본서버가입' | '다른서버선택' | '더알아보기' | '로그인'): Promise<void> {
    await this.driver.$(this[버튼]).click();
  }

  async 버튼글(버튼: '기본서버가입' | '다른서버선택' | '더알아보기' | '로그인'): Promise<string> {
    return this.driver.$(this[버튼]).getText();
  }

  async 버튼이보이나(버튼: '기본서버가입' | '다른서버선택' | '더알아보기' | '로그인'): Promise<boolean> {
    return 보이나(this.driver, this[버튼]);
  }

  async 기본서버버튼이(문구: string, 시간 = 10_000): Promise<boolean> {
    const 식 = 문구식(문구);
    return this.driver
      .waitUntil(async () => 식.test(await this.driver.$(this.기본서버가입).getText()), { timeout: 시간, interval: 500 })
      .then(
        () => true,
        () => false,
      );
  }

  async 시트글이보이나(문구: string): Promise<boolean> {
    return 문구가보이나(this.driver, 문구);
  }
}
