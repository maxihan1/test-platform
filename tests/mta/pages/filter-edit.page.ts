import { 확인창 } from '../components/dialog.component.js';
import { 글자들, 뒤로, 문구가보이나, 앱id, type 앱 } from '../helpers/app.helper.js';
import { 문구나토스트, 정확글누르기, 정확글보이나, 줄누르기, 줄보이나, 줄상태, 포함글수 } from '../helpers/settings.helper.js';

export class 필터편집화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 제목칸 = 앱id('edit');
  readonly 저장 = '~저장';
  readonly 위로 = '~상위 메뉴로 이동';
  readonly 제목들 = 앱id('title');

  readonly 확인: 확인창;

  constructor(private readonly driver: 앱) {
    this.확인 = new 확인창(driver);
  }

  async 떴나(시간 = 15_000): Promise<boolean> {
    return 줄보이나(this.driver, '기간', 시간);
  }

  async 글보이나(문구: string, 시간 = 5_000): Promise<boolean> {
    return 문구가보이나(this.driver, 문구, 시간);
  }

  async 글자보이나(글자: string, 시간 = 5_000): Promise<boolean> {
    return 정확글보이나(this.driver, 글자, 시간);
  }

  async 제목글들(): Promise<string[]> {
    return 글자들(this.driver, this.제목들);
  }

  async 켜졌나(제목: string): Promise<boolean> {
    return (await 줄상태(this.driver, 제목)) === 'true';
  }

  async 제목적기(글: string): Promise<void> {
    const 칸 = await this.driver.$(this.제목칸);
    await 칸.waitForDisplayed({ timeout: 10_000 });
    await 칸.setValue(글);
  }

  async 저장누르기(): Promise<void> {
    await this.driver.$(this.저장).click();
  }

  async 안내보이나(문구: string): Promise<boolean> {
    return 문구나토스트(this.driver, 문구);
  }

  async 줄누르기(제목: string): Promise<void> {
    await 줄누르기(this.driver, 제목);
  }

  async 선택지수(조각: string): Promise<number> {
    return 포함글수(this.driver, 조각);
  }

  async 선택지고르기(글자: string): Promise<void> {
    await 정확글누르기(this.driver, 글자);
  }

  async 삭제누르기(): Promise<void> {
    await 정확글누르기(this.driver, '필터 삭제');
  }

  async 나가기시도(): Promise<void> {
    await this.driver.$(this.위로).click();
  }

  async 확인창떴나(): Promise<boolean> {
    return this.확인.떴나();
  }

  async 확인창본문(): Promise<string> {
    return this.확인.본문글();
  }

  async 창닫기(): Promise<void> {
    await 뒤로(this.driver);
  }

  async 변경버리고나가기(): Promise<void> {
    await this.확인.확인누르기();
  }

  async 취소하기(): Promise<void> {
    await this.확인.취소누르기();
  }

  async 창확인누르기(): Promise<void> {
    await this.확인.확인누르기();
  }
}
