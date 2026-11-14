import { 글자들, 사라질때까지, 뜰때까지, 앱id, type 앱 } from '../helpers/app.helper.js';

const 정확글자 = (글: string): string => `android=new UiSelector().text(${JSON.stringify(글)})`;

export type 양식칸 = '이름' | '사용자명' | '이메일' | '암호' | '암호확인';

export class 가입양식화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 제목 = 정확글자('계정 만들기');
  readonly 칸: Record<양식칸, string> = {
    이름: 앱id('display_name'),
    사용자명: 앱id('username'),
    이메일: 앱id('email'),
    암호: 앱id('password'),
    암호확인: 앱id('password_confirm'),
  };
  readonly 도메인 = 앱id('domain');
  readonly 다음 = 앱id('btn_next');
  readonly 사유칸 = '//*[@resource-id="org.joinmastodon.android:id/reason_wrap"]//android.widget.EditText';
  readonly 줄글들: Record<'사용자명' | '이메일', string> = {
    사용자명: '//*[@resource-id="org.joinmastodon.android:id/username_wrap"]//android.widget.TextView',
    이메일: '//*[@resource-id="org.joinmastodon.android:id/email_wrap"]//android.widget.TextView',
  };

  constructor(private readonly driver: 앱) {}

  async 떴나(시간 = 20_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.제목, 시간);
  }

  async 제목이보이나(): Promise<boolean> {
    return 뜰때까지(this.driver, this.제목, 5_000);
  }

  async 적기(칸: 양식칸, 글: string): Promise<void> {
    const 요소 = await this.driver.$(this.칸[칸]);
    await 요소.waitForDisplayed({ timeout: 10_000 });
    await 요소.clearValue();
    if (글 !== '') await 요소.setValue(글);
  }

  async 칸이름(칸: 양식칸): Promise<string> {
    const 요소 = await this.driver.$(this.칸[칸]);
    await 요소.waitForDisplayed({ timeout: 10_000 });
    const 글 = await 요소.getText();
    return 글 !== '' ? 글 : ((await 요소.getAttribute('hint')) ?? '');
  }

  async 도메인글(): Promise<string> {
    return this.driver.$(this.도메인).getText();
  }

  async 다음글(): Promise<string> {
    return this.driver.$(this.다음).getText();
  }

  async 다음켜졌나(): Promise<boolean> {
    return (await this.driver.$(this.다음).getAttribute('enabled')) === 'true';
  }

  async 다음누르기(): Promise<void> {
    await this.driver.$(this.다음).click();
  }

  async 다른칸누르기(): Promise<void> {
    await this.driver.$(this.칸.이름).click();
  }

  async 사용자명칸에포커스있나(): Promise<boolean> {
    return (await this.driver.$(this.칸.사용자명).getAttribute('focused')) === 'true';
  }

  async 사유칸수(): Promise<number> {
    return (await this.driver.$$(this.사유칸)).length;
  }

  async 글자가보이나(글: string, 시간 = 3_000): Promise<boolean> {
    return 뜰때까지(this.driver, `android=new UiSelector().textContains(${JSON.stringify(글)})`, 시간);
  }

  async 글자가사라질때까지(글: string, 시간 = 10_000): Promise<boolean> {
    return 사라질때까지(this.driver, `android=new UiSelector().textContains(${JSON.stringify(글)})`, 시간);
  }

  async 줄오류글(칸: '사용자명' | '이메일', 시간 = 10_000): Promise<string> {
    let 오류 = '';
    await this.driver
      .waitUntil(
        async () => {
          const 도메인 = await this.도메인글();
          오류 = (await 글자들(this.driver, this.줄글들[칸])).filter((글) => 글 !== '@' && 글 !== 도메인 && 글 !== 칸 && 글 !== '').join(' ');
          return 오류 !== '';
        },
        { timeout: 시간, interval: 500 },
      )
      .catch(() => undefined);
    return 오류;
  }
}
