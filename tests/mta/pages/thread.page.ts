import { 글자가든요소, 글자들, 문구가보이나, 뜰때까지, 사라질때까지, 앱id, type 앱 } from '../helpers/app.helper.js';
import { 정확글보이나, 포함글높이, 포함글누르기 } from '../helpers/settings.helper.js';

export class 글상세화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 시간 = 앱id('time');
  readonly 날짜 = 앱id('date');
  readonly 좋아요수 = 앱id('favorites');
  readonly 부스트수 = 앱id('reblogs');
  readonly 인용수 = 앱id('quotes');
  readonly 홈본문들 = 앱id('text');

  constructor(private readonly driver: 앱) {}

  async 떴나(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.좋아요수, 시간);
  }

  async 홈첫글열기(): Promise<void> {
    const 본문 = await this.driver.$(this.홈본문들);
    await 본문.waitForDisplayed({ timeout: 15_000 });
    await 본문.click();
  }

  async 본문눌러열기(본문조각: string): Promise<void> {
    await (await 글자가든요소(this.driver, 본문조각)).click();
  }

  async 글보이나(문구: string, 시간 = 10_000): Promise<boolean> {
    return 문구가보이나(this.driver, 문구, 시간);
  }

  async 시간보이나(): Promise<boolean> {
    return 뜰때까지(this.driver, this.시간, 5_000);
  }

  async 날짜보이나(): Promise<boolean> {
    return 뜰때까지(this.driver, this.날짜, 5_000);
  }

  async 글높이(본문조각: string): Promise<number> {
    return 포함글높이(this.driver, 본문조각);
  }

  async 답글눌러열기(본문조각: string): Promise<void> {
    await 포함글누르기(this.driver, 본문조각);
  }

  async 글자보이나(글자: string, 시간 = 10_000): Promise<boolean> {
    return 정확글보이나(this.driver, 글자, 시간);
  }

  async 글안보이나(문구: string): Promise<boolean> {
    return !(await 문구가보이나(this.driver, 문구, 5_000));
  }

  async 본문있나(본문조각: string): Promise<boolean> {
    return 글자가든요소(this.driver, 본문조각, 8_000).then(
      () => true,
      () => false,
    );
  }

  async 접힌글보이나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 앱id('spoiler_button'), 시간);
  }

  async 접힌글사라졌나(): Promise<boolean> {
    return 사라질때까지(this.driver, 앱id('spoiler_button'), 10_000);
  }

  async 푸터숫자보이나(): Promise<boolean> {
    await 뜰때까지(this.driver, 앱id('favorite'), 10_000);
    return (await 글자들(this.driver, 앱id('favorite'))).some((글) => /\d/.test(글));
  }

  async 좋아요수누르기(): Promise<void> {
    await this.driver.$(this.좋아요수).click();
  }

  async 부스트수누르기(): Promise<void> {
    await this.driver.$(this.부스트수).click();
  }

  async 인용수누르기(): Promise<void> {
    await this.driver.$(this.인용수).click();
  }

  async 푸터사라졌나(): Promise<boolean> {
    return 사라질때까지(this.driver, this.좋아요수, 10_000);
  }

  async 마지막수정누르기(): Promise<void> {
    await 포함글누르기(this.driver, '마지막 수정');
  }

  async 제목보이나(시간 = 10_000): Promise<boolean> {
    return 문구가보이나(this.driver, '<이름> 님의 게시물', 시간);
  }
}
