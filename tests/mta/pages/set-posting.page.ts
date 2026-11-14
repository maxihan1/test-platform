import { 문구가보이나, 뒤로, type 앱 } from '../helpers/app.helper.js';
import { 정확글누르기, 정확글보이나, 줄누르기, 줄보이나, 줄부제, 줄활성, 포함글수 } from '../helpers/settings.helper.js';

export class 게시기본값화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  constructor(private readonly driver: 앱) {}

  async 떴나(시간 = 15_000): Promise<boolean> {
    return 줄보이나(this.driver, '게시 범위', 시간);
  }

  async 줄보이나(제목: string): Promise<boolean> {
    return 줄보이나(this.driver, 제목, 5_000);
  }

  async 글보이나(문구: string): Promise<boolean> {
    return 문구가보이나(this.driver, 문구, 5_000);
  }

  async 부제글(제목: string): Promise<string> {
    return 줄부제(this.driver, 제목);
  }

  async 활성(제목: string): Promise<string> {
    return 줄활성(this.driver, 제목);
  }

  async 줄누르기(제목: string): Promise<void> {
    await 줄누르기(this.driver, 제목);
  }

  async 선택지보이나(글자: string): Promise<boolean> {
    return 정확글보이나(this.driver, 글자, 5_000);
  }

  async 글자수(글자: string): Promise<number> {
    return 포함글수(this.driver, 글자);
  }

  async 선택지고르기(글자: string): Promise<void> {
    await 정확글누르기(this.driver, 글자);
  }

  async 창이안뜨나(글자: string): Promise<boolean> {
    return !(await 정확글보이나(this.driver, 글자, 3_000));
  }

  async 뒤로가기(): Promise<void> {
    await 뒤로(this.driver);
  }
}
