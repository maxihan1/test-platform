import { 글카드 } from '../components/status-card.component.js';
import { 메뉴 } from '../components/menu.component.js';
import { 글자가든요소, 글자들, 글자로고르기, 문구가보이나, 뜰때까지, 사라질때까지, 앱id, type 앱 } from '../helpers/app.helper.js';
import { 글쓰기닫기 } from '../helpers/settings.helper.js';

export class 인용글쓰기화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 본문칸 = 앱id('toot_text');
  readonly 게시 = 앱id('publish');
  readonly 열람주의 = 앱id('btn_spoiler');
  readonly 경고칸 = 'android=new UiSelector().className("android.widget.EditText").text("열람 주의")';
  readonly 인용글 = 앱id('quoted_post_wrap');
  readonly 인용취소 = '~인용 취소';
  readonly 시트항목들 = 앱id('title');
  readonly 홈부스트들 = 앱id('boost_btn');
  readonly 접기단추들 = 앱id('spoiler_button');

  readonly 글카드: 글카드;
  readonly 메뉴: 메뉴;

  constructor(private readonly driver: 앱) {
    this.글카드 = new 글카드(driver);
    this.메뉴 = new 메뉴(driver);
  }

  async 인용글쓰기로(): Promise<void> {
    await (await 글자로고르기(this.driver, this.시트항목들, '인용하기')).click();
  }

  async 내글부스트시트에서인용하기(본문조각: string): Promise<void> {
    await this.글카드.누르기(본문조각, 'boost_btn');
    await this.인용글쓰기로();
  }

  async 홈첫글인용하기(): Promise<void> {
    const 단추 = await this.driver.$(this.홈부스트들);
    await 단추.waitForDisplayed({ timeout: 15_000 });
    await 단추.click();
    await this.인용글쓰기로();
  }

  async 떴나(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.인용글, 시간);
  }

  async 인용글에글이있나(문구: string): Promise<boolean> {
    return 문구가보이나(this.driver, 문구, 5_000);
  }

  async 인용취소누르기(): Promise<void> {
    await this.driver.$(this.인용취소).click();
  }

  async 인용글사라졌나(): Promise<boolean> {
    return 사라질때까지(this.driver, this.인용글, 10_000);
  }

  async 닫기(): Promise<void> {
    await 글쓰기닫기(this.driver);
  }

  async 수정열기(본문조각: string): Promise<void> {
    await this.글카드.누르기(본문조각, 'more');
    await this.메뉴.고르기('수정');
    await this.driver.$(this.본문칸).waitForDisplayed({ timeout: 15_000 });
  }

  async 본문덧붙이기(글: string): Promise<void> {
    await this.driver.$(this.본문칸).addValue(글);
  }

  async 경고달기(글: string): Promise<void> {
    await this.driver.$(this.열람주의).click();
    const 칸 = await this.driver.$(this.경고칸);
    await 칸.waitForDisplayed({ timeout: 10_000 });
    await 칸.setValue(글);
  }

  async 게시하고홈기다리기(): Promise<void> {
    await this.driver.$(this.게시).click();
    if (!(await 뜰때까지(this.driver, 앱id('fab'), 30_000))) throw new Error('글을 올린 뒤 30초 안에 홈으로 돌아오지 않았다');
  }

  async 경고글펼치고열기(경고글: string, 본문조각: string): Promise<void> {
    const 경고 = await 글자가든요소(this.driver, 경고글);
    const 높이 = (await 경고.getLocation()).y;
    const 담음: { 요소?: WebdriverIO.Element; 거리: number } = { 거리: Number.POSITIVE_INFINITY };
    for (const 후보 of await this.driver.$$(this.접기단추들)) {
      const 거리 = Math.abs((await 후보.getLocation()).y - 높이);
      if (거리 < 담음.거리) {
        담음.요소 = 후보;
        담음.거리 = 거리;
      }
    }
    if (!담음.요소) throw new Error('열람 주의 접기 단추를 찾지 못했다');
    await 담음.요소.click();
    await (await 글자가든요소(this.driver, 본문조각)).click();
  }

  async 홈첫글부스트시트열기(): Promise<void> {
    const 단추 = await this.driver.$(this.홈부스트들);
    await 단추.waitForDisplayed({ timeout: 15_000 });
    await 단추.click();
  }

  async 시트항목글자(): Promise<string[]> {
    await this.driver.$(this.시트항목들).waitForDisplayed({ timeout: 10_000 });
    return 글자들(this.driver, this.시트항목들);
  }
}
