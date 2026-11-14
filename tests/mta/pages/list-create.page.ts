import { 문구가보이나, type 앱 } from '../helpers/app.helper.js';
import { 문구나토스트, 정확글누르기, 정확글보이나 } from '../helpers/settings.helper.js';

export class 목록만들기화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 이름칸 = 'android=new UiSelector().className("android.widget.EditText")';

  constructor(private readonly driver: 앱) {}

  async 떴나(시간 = 15_000): Promise<boolean> {
    return 정확글보이나(this.driver, '2개 중 1번째 단계', 시간);
  }

  async 글보이나(문구: string, 시간 = 5_000): Promise<boolean> {
    return 문구가보이나(this.driver, 문구, 시간);
  }

  async 글자보이나(글자: string, 시간 = 5_000): Promise<boolean> {
    return 정확글보이나(this.driver, 글자, 시간);
  }

  async 이름적기(이름: string): Promise<void> {
    const 칸 = await this.driver.$(this.이름칸);
    await 칸.waitForDisplayed({ timeout: 10_000 });
    await 칸.setValue(이름);
  }

  async 만들기누르기(): Promise<void> {
    await 정확글누르기(this.driver, '만들기');
  }

  async 안내보이나(문구: string): Promise<boolean> {
    return 문구나토스트(this.driver, 문구);
  }
}
