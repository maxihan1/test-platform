import type { AppDriver } from '@platform/kit/app';
import { 먼저뜨는것, 보이나, 될때까지, 뜰때까지 } from '@platform/kit/parts';

export class 웹로그인화면 {
  readonly 이메일칸 = 'id=user_email';
  readonly 승인 = 'android=new UiSelector().resourceId("com.android.chrome:id/compositor_view_holder").childSelector(new UiSelector().className("android.widget.Button").text("승인"))';
  readonly 거부 = 'android=new UiSelector().resourceId("com.android.chrome:id/compositor_view_holder").childSelector(new UiSelector().className("android.widget.Button").text("거부"))';
  readonly 앱이름 = 'android=new UiSelector().resourceId("com.android.chrome:id/compositor_view_holder").childSelector(new UiSelector().className("android.view.View").text("Mastodon for Android"))';
  readonly 주소창 = 'id=com.android.chrome:id/url_bar';
  readonly 앱선택창 = 'id=android:id/resolver_list';
  readonly 첫실행넘기기 = 'id=com.android.chrome:id/signin_fre_dismiss_button';

  constructor(private readonly driver: AppDriver) {}

  async 승인화면떴나(시간 = 20_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.승인, 시간);
  }

  async 브라우저떴나(시간 = 20_000): Promise<boolean> {
    const 뜬것 = await 먼저뜨는것(this.driver, { 첫실행: this.첫실행넘기기, 주소창: this.주소창 }, 시간);
    if (뜬것 === '첫실행') {
      await this.driver.$(this.첫실행넘기기).click();
      return 뜰때까지(this.driver, this.주소창, 시간);
    }
    return 뜬것 === '주소창';
  }

  async 앱선택창이나브라우저떴나(시간 = 20_000): Promise<boolean> {
    if ((await 먼저뜨는것(this.driver, { 앱선택창: this.앱선택창, 주소창: this.주소창 }, 시간)) !== undefined) return true;
    return (await this.driver.getCurrentPackage()) === 'com.android.chrome';
  }

  async 주소글(): Promise<string> {
    return this.driver.$(this.주소창).getText();
  }

  async 주소에든글자뜰때까지(글자: string, 시간 = 15_000): Promise<boolean> {
    return 될때까지(this.driver, async () => (await 보이나(this.driver, this.주소창)) && (await this.주소글()).includes(글자), 시간);
  }

  async 맞춤탭인가(): Promise<boolean> {
    return (await this.driver.getCurrentActivity()).includes('CustomTab');
  }

  async 앱이름떴나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.앱이름, 시간);
  }

  async 승인누르기(): Promise<void> {
    await this.driver.$(this.승인).click();
  }

  async 거부누르기(): Promise<void> {
    await this.driver.$(this.거부).click();
  }
}
