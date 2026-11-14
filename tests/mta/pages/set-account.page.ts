import { 글자들, 글자로고르기, 뜰때까지, 앱id, type 앱 } from '../helpers/app.helper.js';
import { 정확글보이나, 줄누르기, 줄보이나, 줄부제, 줄활성 } from '../helpers/settings.helper.js';

export class 계정설정화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 실제제목 = 앱id('real_title');
  readonly 제목들 = 앱id('title');

  constructor(private readonly driver: 앱) {}

  async 떴나(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.실제제목, 시간);
  }

  async 제목글(): Promise<string> {
    return this.driver.$(this.실제제목).getText();
  }

  async 제목글들(): Promise<string[]> {
    return 글자들(this.driver, this.제목들);
  }

  async 줄보이나(제목: string): Promise<boolean> {
    return 줄보이나(this.driver, 제목, 5_000);
  }

  async 줄누르기(제목: string): Promise<void> {
    await 줄누르기(this.driver, 제목);
  }

  async 부제글(제목: string): Promise<string> {
    return 줄부제(this.driver, 제목);
  }

  async 활성(제목: string): Promise<string> {
    return 줄활성(this.driver, 제목);
  }

  async 글자보이나(글자: string, 시간 = 10_000): Promise<boolean> {
    return 정확글보이나(this.driver, 글자, 시간);
  }

  async 줄클릭하면화면이그대로인가(제목: string): Promise<boolean> {
    await (await 글자로고르기(this.driver, this.제목들, 제목)).click();
    return 뜰때까지(this.driver, this.실제제목, 3_000);
  }
}
