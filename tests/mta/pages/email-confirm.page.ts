import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지 } from '@platform/kit/parts';

export class 이메일확인화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 제목 = this.화면글('수신함 확인하기');
  readonly 안내 = this.화면글('에 인증하기 위해 우리가 보낸 링크를 누르세요. 여기서 기다리겠습니다.');
  readonly 물음표 = 'android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().text("?"))';
  readonly 이메일앱열기 = 'android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().text("이메일 앱 열기"))';
  readonly 재전송켜짐 = 'android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().text("재전송").enabled(true))';
  readonly 재전송카운트 = 'android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().textStartsWith("재전송 ("))';

  constructor(private readonly driver: AppDriver) {}

  화면글(글자: string): string {
    return `android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().textContains(${JSON.stringify(글자)}))`;
  }

  async 그려질때까지(시간 = 30_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.제목, 시간);
  }

  async 글보이나(글자: string, 시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.화면글(글자), 시간);
  }

  async 재전송켜질때까지(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.재전송켜짐, 시간);
  }

  async 재전송누르기(): Promise<void> {
    await this.driver.$(this.재전송켜짐).click();
  }

  async 재전송글(): Promise<string> {
    return this.driver.$(this.재전송카운트).getText();
  }

  async 재전송꺼졌나(): Promise<boolean> {
    return (await this.driver.$(this.재전송카운트).getAttribute('enabled')) === 'false';
  }

  async 이메일앱열기누르기(): Promise<void> {
    await this.driver.$(this.이메일앱열기).click();
  }
}
