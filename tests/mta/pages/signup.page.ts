import type { AppDriver } from '@platform/kit/app';
import { 될때까지, 뜰때까지, 보이나, 칸에적기 } from '@platform/kit/parts';

export interface 가입값 {
  이름: string;
  사용자명: string;
  이메일: string;
  암호: string;
  암호확인: string;
}

export class 가입양식화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 제목 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/toolbar").childSelector(new UiSelector().className("android.widget.TextView"))';
  readonly 이름칸 = 'id=org.joinmastodon.android:id/display_name';
  readonly 사용자명칸 = 'id=org.joinmastodon.android:id/username';
  readonly 도메인 = 'id=org.joinmastodon.android:id/domain';
  readonly 이메일칸 = 'id=org.joinmastodon.android:id/email';
  readonly 암호칸 = 'id=org.joinmastodon.android:id/password';
  readonly 암호확인칸 = 'id=org.joinmastodon.android:id/password_confirm';
  readonly 가입사유칸 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/reason_wrap").childSelector(new UiSelector().className("android.widget.EditText"))';
  readonly 생년월일 = 'android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().textContains("생년월일"))';
  readonly 다음 = 'id=org.joinmastodon.android:id/btn_next';
  readonly 다음켜짐 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/btn_next").enabled(true)';

  constructor(private readonly driver: AppDriver) {}

  화면글(글자: string): string {
    return `android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().textContains(${JSON.stringify(글자)}))`;
  }

  async 그려질때까지(시간 = 20_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.사용자명칸, 시간);
  }

  async 제목글(): Promise<string> {
    return this.driver.$(this.제목).getText();
  }

  async 도메인글(): Promise<string> {
    return this.driver.$(this.도메인).getText();
  }

  async 적기(칸: '이름칸' | '사용자명칸' | '이메일칸' | '암호칸' | '암호확인칸', 값: string): Promise<void> {
    await 칸에적기(await this.driver.$(this[칸]).getElement(), 값);
  }

  async 채우기(값: 가입값): Promise<void> {
    await this.적기('이름칸', 값.이름);
    await this.적기('사용자명칸', 값.사용자명);
    await this.적기('이메일칸', 값.이메일);
    await this.적기('암호칸', 값.암호);
    await this.적기('암호확인칸', 값.암호확인);
  }

  async 다음이켜질때까지(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.다음켜짐, 시간);
  }

  async 다음이꺼진채인가(): Promise<boolean> {
    return !(await 뜰때까지(this.driver, this.다음켜짐, 3_000));
  }

  async 다음누르기(): Promise<void> {
    await this.driver.$(this.다음켜짐).click();
  }

  async 칸보이나(칸: '이름칸' | '사용자명칸' | '이메일칸' | '암호칸' | '암호확인칸' | '다음' | '가입사유칸' | '생년월일'): Promise<boolean> {
    return 보이나(this.driver, this[칸]);
  }

  async 글보이나(글자: string, 시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.화면글(글자), 시간);
  }

  async 포커스가갈때까지(칸: '이름칸' | '사용자명칸' | '이메일칸' | '암호칸' | '암호확인칸', 시간 = 10_000): Promise<boolean> {
    return 될때까지(this.driver, () => this.포커스있나(칸), 시간);
  }

  async 포커스있나(칸: '이름칸' | '사용자명칸' | '이메일칸' | '암호칸' | '암호확인칸'): Promise<boolean> {
    return (await this.driver.$(this[칸]).getAttribute('focused')) === 'true';
  }
}
