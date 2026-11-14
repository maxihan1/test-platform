import { 메뉴 } from '../components/menu.component.js';
import { 글자들, 글자로고르기, 뒤로, 문구가보이나, 뜰때까지, 보이나, 앱id, type 앱 } from '../helpers/app.helper.js';
import { 정확글보이나 } from '../helpers/settings.helper.js';

export class 신고화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 프로필옵션 = 앱id('options_btn');
  readonly 홈더보기 = 앱id('more');
  readonly 제목들 = 앱id('title');
  readonly 부제들 = 앱id('subtitle');
  readonly 다음 = 앱id('btn_next');
  readonly 체크들 = 앱id('checkbox');
  readonly 본문들 = 앱id('text');
  readonly 팔로우해제줄 = 앱id('unfollow_btn');
  readonly 뮤트줄 = 앱id('mute_btn');
  readonly 차단줄 = 앱id('block_btn');
  readonly 뮤트제목 = 앱id('mute_title');
  readonly 의견칸 = 앱id('text');

  readonly 메뉴: 메뉴;

  constructor(private readonly driver: 앱) {
    this.메뉴 = new 메뉴(driver);
  }

  async 프로필에서열기(): Promise<void> {
    await this.driver.$(this.프로필옵션).click();
    await this.메뉴.고르기('Report account');
  }

  async 홈첫글본문(): Promise<string> {
    const 칸 = await this.driver.$(this.본문들);
    await 칸.waitForDisplayed({ timeout: 15_000 });
    return 칸.getText();
  }

  async 홈첫글에서열기(): Promise<void> {
    const 단추 = await this.driver.$(this.홈더보기);
    await 단추.waitForDisplayed({ timeout: 15_000 });
    await 단추.click();
    const 항목들 = await this.메뉴.항목글자();
    const 신고 = 항목들.find((글) => 글.endsWith(' 신고'));
    if (신고 === undefined) throw new Error(`글 더보기 메뉴에 신고 항목이 없다: ${항목들.join(', ')}`);
    await this.메뉴.고르기(신고);
  }

  async 이유목록떴나(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.다음, 시간);
  }

  async 글보이나(문구: string, 시간 = 10_000): Promise<boolean> {
    return 문구가보이나(this.driver, 문구, 시간);
  }

  async 글자보이나(글자: string, 시간 = 5_000): Promise<boolean> {
    return 정확글보이나(this.driver, 글자, 시간);
  }

  async 제목글들(): Promise<string[]> {
    return 글자들(this.driver, this.제목들);
  }

  async 부제글들(): Promise<string[]> {
    return 글자들(this.driver, this.부제들);
  }

  async 이유고르기(이유: string): Promise<void> {
    await (await 글자로고르기(this.driver, this.제목들, 이유)).click();
  }

  async 다음누르기(): Promise<void> {
    await this.driver.$(this.다음).click();
  }

  async 이전으로(): Promise<void> {
    await 뒤로(this.driver);
  }

  async 완료화면떴나(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.차단줄, 시간);
  }

  async 동작줄보이나(줄: '팔로우해제줄' | '뮤트줄' | '차단줄'): Promise<boolean> {
    return 보이나(this.driver, this[줄]);
  }

  async 뮤트줄누르기(): Promise<void> {
    await this.driver.$(this.뮤트줄).click();
  }

  async 뮤트줄글(): Promise<string> {
    return this.driver.$(this.뮤트제목).getText();
  }

  async 첫글체크됨(): Promise<string> {
    await 뜰때까지(this.driver, this.체크들, 10_000);
    return (await (await this.driver.$$(this.체크들))[0]?.getAttribute('checked')) ?? '';
  }

  async 글체크됨(본문: string): Promise<string> {
    const 글 = await 글자로고르기(this.driver, this.본문들, 본문);
    const 높이 = (await 글.getLocation()).y;
    const 담음: { 요소?: WebdriverIO.Element; 높이: number } = { 높이: Number.NEGATIVE_INFINITY };
    for (const 후보 of await this.driver.$$(this.체크들)) {
      const 위 = (await 후보.getLocation()).y;
      if (위 < 높이 && 위 > 담음.높이) {
        담음.요소 = 후보;
        담음.높이 = 위;
      }
    }
    if (!담음.요소) throw new Error('신고 글 고르기에서 그 글의 체크를 찾지 못했다');
    return (await 담음.요소.getAttribute('checked')) ?? '';
  }

  async 규칙첫째고르기(): Promise<void> {
    await 뜰때까지(this.driver, this.체크들, 10_000);
    await (await this.driver.$$(this.체크들))[0]?.click();
  }
}
