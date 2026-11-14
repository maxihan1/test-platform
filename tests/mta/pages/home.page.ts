import { 하단탭 } from '../components/tab-bar.component.js';
import { 글자들, 글자로고르기, 보이나, 사라질때까지, 뜰때까지, 앱id, type 앱 } from '../helpers/app.helper.js';

const 정확글자 = (글: string): string => `android=new UiSelector().text(${JSON.stringify(글)})`;

export class 홈화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/alt_button';

  readonly 탭: 하단탭;
  readonly 제목 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/toolbar").childSelector(new UiSelector().className("android.widget.Spinner"))';
  readonly 설정 = '~설정';
  readonly 글쓰기 = 앱id('fab');
  readonly 목록 = 앱id('list');
  readonly 본문들 = 앱id('text');
  readonly 답장들 = 앱id('reply_btn');
  readonly 부스트들 = 앱id('boost_btn');
  readonly 좋아요들 = 앱id('favorite_btn');
  readonly 공유들 = 앱id('share_btn');
  readonly 더보기들 = 앱id('more');
  readonly 목록관리 = '~목록 관리';
  readonly 새게시물버튼 = 정확글자('새 게시물');
  readonly 글쓰기본문 = 앱id('toot_text');
  readonly 드롭다운글들 = 'android=new UiSelector().className("android.widget.TextView")';

  constructor(private readonly driver: 앱) {
    this.탭 = new 하단탭(driver);
  }

  async 떴나(시간 = 30_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.글쓰기, 시간);
  }

  async 드롭다운열기(): Promise<void> {
    await this.driver.$(this.제목).click();
  }

  async 제목글(): Promise<string> {
    return this.driver.$(this.제목).$('android.widget.TextView').getText();
  }

  async 제목이보이나(): Promise<boolean> {
    return 보이나(this.driver, this.제목);
  }

  async 드롭다운글자들(): Promise<string[]> {
    await this.driver.$(this.드롭다운글들).waitForDisplayed({ timeout: 10_000 });
    return 글자들(this.driver, this.드롭다운글들);
  }

  async 드롭다운고르기(글: string): Promise<void> {
    await (await 글자로고르기(this.driver, this.드롭다운글들, 글)).click();
  }

  async 드롭다운하위열기(항목: '목록' | '팔로우 중인 해시태그'): Promise<boolean> {
    await this.드롭다운고르기(항목);
    return 뜰때까지(this.driver, 정확글자(`${항목}. 뒤로 가기`), 10_000);
  }

  async 설정누르기(): Promise<void> {
    await this.driver.$(this.설정).click();
  }

  async 설정화면떴나(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, 정확글자('설정'), 시간);
  }

  async 글쓰기누르기(): Promise<void> {
    await this.driver.$(this.글쓰기).click();
  }

  async 글쓰기화면떴나(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.글쓰기본문, 시간);
  }

  async 목록관리아이콘이뜰때까지(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.목록관리, 시간);
  }

  async 설정아이콘이보이나(): Promise<boolean> {
    return 보이나(this.driver, this.설정);
  }

  async 첫글(): Promise<string> {
    const 첫 = await this.driver.$(this.본문들);
    await 첫.waitForDisplayed({ timeout: 15_000 });
    return 첫.getText();
  }

  async 맨위글이될때까지(글: string, 시간 = 10_000): Promise<boolean> {
    return this.driver
      .waitUntil(async () => (await this.driver.$(this.본문들).getText()) === 글, { timeout: 시간, interval: 500 })
      .then(
        () => true,
        () => false,
      );
  }

  async 글수(): Promise<number> {
    return (await this.driver.$$(this.본문들)).length;
  }

  async 빈틈줄이보이나(방향: '위' | '아래', 시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, `android=new UiSelector().textContains("${방향}에서 놓친 게시물 불러오기")`, 시간);
  }

  async 빈틈줄누르기(방향: '위' | '아래'): Promise<void> {
    await this.driver.$(`android=new UiSelector().textContains("${방향}에서 놓친 게시물 불러오기")`).click();
  }

  async 새게시물버튼이뜰때까지(시간 = 30_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.새게시물버튼, 시간);
  }

  async 새게시물버튼누르기(): Promise<void> {
    await this.driver.$(this.새게시물버튼).click();
  }

  async 새게시물버튼이사라질때까지(시간 = 10_000): Promise<boolean> {
    return 사라질때까지(this.driver, this.새게시물버튼, 시간);
  }

  async 빈틈줄이사라질때까지(방향: '위' | '아래', 시간 = 20_000): Promise<boolean> {
    return 사라질때까지(this.driver, `android=new UiSelector().textContains("${방향}에서 놓친 게시물 불러오기")`, 시간);
  }
}
