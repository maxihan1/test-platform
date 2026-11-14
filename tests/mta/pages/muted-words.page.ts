import { 확인창 } from '../components/dialog.component.js';
import { 문구가보이나, 뒤로, type 앱 } from '../helpers/app.helper.js';
import { 문구나토스트, 정확글누르기, 정확글보이나 } from '../helpers/settings.helper.js';

export class 뮤트된단어화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 입력칸 = 'android=new UiSelector().className("android.widget.EditText")';

  readonly 확인: 확인창;

  constructor(private readonly driver: 앱) {
    this.확인 = new 확인창(driver);
  }

  async 떴나(시간 = 15_000): Promise<boolean> {
    return 정확글보이나(this.driver, '뮤트할 단어 추가', 시간);
  }

  async 글보이나(문구: string, 시간 = 5_000): Promise<boolean> {
    return 문구가보이나(this.driver, 문구, 시간);
  }

  async 글자보이나(글자: string, 시간 = 5_000): Promise<boolean> {
    return 정확글보이나(this.driver, 글자, 시간);
  }

  async 안내보이나(문구: string): Promise<boolean> {
    return 문구나토스트(this.driver, 문구);
  }

  async 추가창열기(): Promise<void> {
    await 정확글누르기(this.driver, '뮤트할 단어 추가');
    await this.driver.$(this.입력칸).waitForDisplayed({ timeout: 10_000 });
  }

  async 단어넣고확인(단어: string): Promise<void> {
    const 칸 = await this.driver.$(this.입력칸);
    await 칸.setValue(단어);
    await this.확인.확인누르기();
  }

  async 단어누르기(단어: string): Promise<void> {
    await 정확글누르기(this.driver, 단어);
  }

  async 편집창닫기(): Promise<void> {
    await 뒤로(this.driver);
  }
}
