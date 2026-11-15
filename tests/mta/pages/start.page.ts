import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지, 움직이는화면에서 } from '@platform/kit/parts';

export class 시작화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 기본서버가입 = 'id=org.joinmastodon.android:id/btn_join_default_server';
  readonly 다른서버선택 = 'id=org.joinmastodon.android:id/btn_get_started';
  readonly 로그인 = 'id=org.joinmastodon.android:id/btn_log_in';
  readonly 더알아보기 = 'id=org.joinmastodon.android:id/btn_learn_more';
  readonly 환영제목 = 'android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().text("Mastodon에 오신 것을 환영합니다"))';
  readonly 서버설명제목 = 'android=new UiSelector().resourceId("android:id/content").childSelector(new UiSelector().text("서버란 무엇인가요?"))';

  constructor(private readonly driver: AppDriver) {}

  async 그려질때까지(시간 = 30_000): Promise<boolean> {
    return 움직이는화면에서(this.driver, () => 뜰때까지(this.driver, this.로그인, 시간));
  }

  async 누르기(버튼: '기본서버가입' | '다른서버선택' | '로그인' | '더알아보기'): Promise<void> {
    await 움직이는화면에서(this.driver, async () => {
      await this.driver.$(this[버튼]).click();
    });
  }

  async 글(버튼: '기본서버가입' | '다른서버선택' | '로그인' | '더알아보기'): Promise<string> {
    return 움직이는화면에서(this.driver, () => this.driver.$(this[버튼]).getText());
  }
}
