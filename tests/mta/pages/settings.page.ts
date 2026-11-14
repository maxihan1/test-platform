import { 글자들, 글자로고르기, 앱id, type 앱 } from '../helpers/app.helper.js';
import { 줄보이나 } from '../helpers/settings.helper.js';

export class 설정화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 설정단추 = '~설정';
  readonly 제목들 = 앱id('title');

  constructor(private readonly driver: 앱) {}

  async 열기(): Promise<boolean> {
    await this.driver.$(this.설정단추).click();
    return 줄보이나(this.driver, '계정 추가...', 15_000);
  }

  async 제목글들(): Promise<string[]> {
    await 줄보이나(this.driver, '계정 추가...', 10_000);
    return 글자들(this.driver, this.제목들);
  }

  async 줄누르기(제목: string): Promise<void> {
    await (await 글자로고르기(this.driver, this.제목들, 제목)).click();
  }

  async 계정줄글들(): Promise<string[]> {
    return (await this.제목글들()).filter((글) => /^@.+@.+$/.test(글));
  }

  async 계정줄누르기(): Promise<void> {
    const [계정] = await this.계정줄글들();
    if (계정 === undefined) throw new Error('설정에 계정 줄이 없다');
    await this.줄누르기(계정);
  }
}
