import { 메뉴 } from '../components/menu.component.js';
import { 스낵바 } from '../components/snackbar.component.js';
import { 문구가보이나, 문구식, 뜰때까지, 앱id, type 앱 } from '../helpers/app.helper.js';
import { 정확글누르기, 정확글보이나 } from '../helpers/settings.helper.js';

export class 뮤트시트 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 프로필옵션 = 앱id('options_btn');
  readonly 동작버튼 = 앱id('profile_action_btn');

  readonly 메뉴: 메뉴;
  readonly 스낵바: 스낵바;

  constructor(private readonly driver: 앱) {
    this.메뉴 = new 메뉴(driver);
    this.스낵바 = new 스낵바(driver);
  }

  async 메뉴열기(): Promise<void> {
    await this.driver.$(this.프로필옵션).click();
  }

  async 메뉴에서고르기(항목: string): Promise<void> {
    await this.메뉴열기();
    await this.메뉴.고르기(항목);
  }

  async 시트떴나(시간 = 10_000): Promise<boolean> {
    return 정확글보이나(this.driver, '사용자를 뮤트할까요?', 시간);
  }

  async 글보이나(문구: string, 시간 = 5_000): Promise<boolean> {
    return 문구가보이나(this.driver, 문구, 시간);
  }

  async 단추보이나(글자: string): Promise<boolean> {
    return 정확글보이나(this.driver, 글자, 5_000);
  }

  async 뮤트하기(): Promise<void> {
    await 정확글누르기(this.driver, '뮤트');
  }

  async 취소하기(): Promise<void> {
    await 정확글누르기(this.driver, '취소');
  }

  async 해제하기(): Promise<void> {
    await this.메뉴열기();
    const 항목들 = await this.메뉴.항목글자();
    const 해제 = 항목들.find((글) => /unmute|뮤트 해제/i.test(글));
    if (해제 === undefined) throw new Error(`프로필 메뉴에 뮤트 해제 항목이 없다: ${항목들.join(', ')}`);
    await this.메뉴.고르기(해제);
  }

  async 해제되어있게하기(): Promise<void> {
    await this.메뉴열기();
    const 항목들 = await this.메뉴.항목글자();
    const 해제 = 항목들.find((글) => /unmute|뮤트 해제/i.test(글));
    if (해제 === undefined) {
      await this.driver.back();
      return;
    }
    await this.메뉴.고르기(해제);
  }

  async 알림글(): Promise<string> {
    return this.스낵바.글();
  }

  async 프로필떴나(): Promise<boolean> {
    return 뜰때까지(this.driver, this.동작버튼, 20_000);
  }

  async 알림이될때까지(문구: string): Promise<boolean> {
    const 식 = 문구식(문구);
    return this.driver
      .waitUntil(async () => 식.test(await this.스낵바.글(1_000)), { timeout: 10_000, interval: 500 })
      .then(
        () => true,
        () => false,
      );
  }
}
