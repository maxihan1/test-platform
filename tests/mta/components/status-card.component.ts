import { 앱id, 글자가든요소, 길게누르기, type 앱 } from '../helpers/app.helper.js';

export type 글버튼 = 'reply_btn' | 'boost_btn' | 'favorite_btn' | 'share_btn' | 'more';

export class 글카드 {
  readonly 본문들 = 앱id('text');
  readonly 이름들 = 앱id('name');
  readonly 시간과계정들 = 앱id('time_and_username');
  readonly 프로필로 = 앱id('clickable_thing');
  readonly 더보기들 = 앱id('more');
  readonly 답장들 = 앱id('reply_btn');
  readonly 부스트들 = 앱id('boost_btn');
  readonly 좋아요들 = 앱id('favorite_btn');
  readonly 공유들 = 앱id('share_btn');
  readonly 좋아요수들 = 앱id('favorite');

  constructor(private readonly driver: 앱) {}

  async 본문찾기(본문조각: string): Promise<void> {
    await 글자가든요소(this.driver, 본문조각);
  }

  async 아래버튼(본문조각: string, 버튼: 글버튼): Promise<WebdriverIO.Element> {
    const 본문 = await 글자가든요소(this.driver, 본문조각);
    const 위 = (await 본문.getLocation()).y;
    for (const 후보 of await this.driver.$$(앱id(버튼))) {
      if ((await 후보.getLocation()).y > 위) return 후보;
    }
    throw new Error(`「${본문조각}」 글 아래에서 ${버튼} 을 찾지 못했다`);
  }

  async 위버튼(본문조각: string, 버튼: 'more' | 'clickable_thing'): Promise<WebdriverIO.Element> {
    const 본문 = await 글자가든요소(this.driver, 본문조각);
    const 위 = (await 본문.getLocation()).y;
    let 찾은: WebdriverIO.Element | undefined;
    for (const 후보 of await this.driver.$$(앱id(버튼))) {
      if ((await 후보.getLocation()).y < 위) 찾은 = 후보;
    }
    if (!찾은) throw new Error(`「${본문조각}」 글 위에서 ${버튼} 을 찾지 못했다`);
    return 찾은;
  }

  async 누르기(본문조각: string, 버튼: 글버튼): Promise<void> {
    const 요소 = 버튼 === 'more' ? await this.위버튼(본문조각, 'more') : await this.아래버튼(본문조각, 버튼);
    await 요소.click();
  }

  async 길게누르기(본문조각: string, 버튼: 'boost_btn' | 'favorite_btn'): Promise<void> {
    const 요소 = await this.아래버튼(본문조각, 버튼);
    await this.driver.execute('mobile: longClickGesture', { elementId: 요소.elementId, duration: 1200 });
  }

  async 첫글버튼길게(버튼: 'boost_btn' | 'favorite_btn'): Promise<void> {
    await 길게누르기(this.driver, 앱id(버튼));
  }
}
