import { 문구가보이나, type 앱 } from '../helpers/app.helper.js';
import { 정확글누르기, 정확글보이나 } from '../helpers/settings.helper.js';

export class 목록구성원화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 검색칸 = 'android=new UiSelector().className("android.widget.EditText")';

  constructor(private readonly driver: 앱) {}

  async 떴나(시간 = 15_000): Promise<boolean> {
    return 정확글보이나(this.driver, '2개 중 2번째 단계', 시간);
  }

  async 글보이나(문구: string, 시간 = 5_000): Promise<boolean> {
    return 문구가보이나(this.driver, 문구, 시간);
  }

  async 글자보이나(글자: string, 시간 = 5_000): Promise<boolean> {
    return 정확글보이나(this.driver, 글자, 시간);
  }

  async 검색하기(사용자명: string): Promise<void> {
    const 칸 = await this.driver.$(this.검색칸);
    await 칸.waitForDisplayed({ timeout: 10_000 });
    await 칸.setValue(사용자명);
  }

  async 계정보이나(사용자명: string, 시간 = 10_000): Promise<boolean> {
    return 문구가보이나(this.driver, `@${사용자명}`, 시간);
  }

  async 완료누르기(): Promise<void> {
    await 정확글누르기(this.driver, '완료');
  }
}
