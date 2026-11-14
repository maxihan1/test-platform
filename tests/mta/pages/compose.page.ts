import { 뜰때까지, 앱id, type 앱 } from '../helpers/app.helper.js';

export class 글쓰기화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 닫기 = '~뒤로 가기';
  readonly 게시 = 앱id('publish');
  readonly 공개범위 = 앱id('btn_visibility');
  readonly 공개범위글 = 앱id('visibility_text1');
  readonly 아바타 = 앱id('avatar');
  readonly 이름 = 앱id('name');
  readonly 사용자 = 앱id('username');
  readonly 본문칸 = 앱id('toot_text');
  readonly 입력칸들 = 'android=new UiSelector().className("android.widget.EditText")';
  readonly 대체텍스트칸 = 'android=new UiSelector().className("android.widget.EditText").text("대체 텍스트")';
  readonly 경고칸 = 'android=new UiSelector().className("android.widget.EditText").text("열람 주의")';
  readonly 미디어 = 앱id('btn_media');
  readonly 투표 = 앱id('btn_poll');
  readonly 에모지 = 앱id('btn_emoji');
  readonly 열람주의 = 앱id('btn_spoiler');
  readonly 언어 = 앱id('btn_language');
  readonly 글자수 = 앱id('char_counter');
  readonly 인용글 = 앱id('quoted_post_wrap');
  readonly 투표영역 = 앱id('poll_wrap');
  readonly 투표항목들 = 앱id('edit');
  readonly 투표손잡이들 = '~재정렬';
  readonly 투표항목추가 = 앱id('add_poll_option');
  readonly 설문길이 = 앱id('poll_duration');
  readonly 설문길이값 = 앱id('poll_duration_value');
  readonly 설문스타일 = 앱id('poll_style');
  readonly 설문스타일값 = 앱id('poll_style_value');

  constructor(private readonly driver: 앱) {}

  async 떴나(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.본문칸, 시간);
  }

  async 본문적기(글: string): Promise<void> {
    await this.driver.$(this.본문칸).setValue(글);
  }

  async 본문덧붙이기(글: string): Promise<void> {
    await this.driver.$(this.본문칸).addValue(글);
  }

  async 본문지우기(): Promise<void> {
    await this.driver.$(this.본문칸).clearValue();
  }

  async 본문글(): Promise<string> {
    return this.driver.$(this.본문칸).getText();
  }

  async 대체텍스트적기(글: string): Promise<void> {
    await this.driver.$(this.대체텍스트칸).setValue(글);
  }

  async 경고적기(글: string): Promise<void> {
    await this.driver.$(this.경고칸).setValue(글);
  }

  async 게시누르기(): Promise<void> {
    await this.driver.$(this.게시).click();
  }

  async 닫기누르기(): Promise<void> {
    await this.driver.$(this.닫기).click();
  }

  async 열람주의누르기(): Promise<void> {
    await this.driver.$(this.열람주의).click();
  }

  async 투표누르기(): Promise<void> {
    await this.driver.$(this.투표).click();
  }

  async 투표항목추가누르기(): Promise<void> {
    await this.driver.$(this.투표항목추가).click();
  }

  async 설문길이누르기(): Promise<void> {
    await this.driver.$(this.설문길이).click();
  }

  async 설문스타일누르기(): Promise<void> {
    await this.driver.$(this.설문스타일).click();
  }

  async 공개범위누르기(): Promise<void> {
    await this.driver.$(this.공개범위).click();
  }

  async 미디어누르기(): Promise<void> {
    await this.driver.$(this.미디어).click();
  }

  async 언어누르기(): Promise<void> {
    await this.driver.$(this.언어).click();
  }

  async 투표항목적기(번호: number, 글: string): Promise<void> {
    const 칸 = (await this.driver.$$(this.투표항목들))[번호 - 1];
    if (!칸) throw new Error(`투표 항목 ${번호}번 칸이 없다`);
    await 칸.setValue(글);
  }

  async 투표항목글(번호: number): Promise<string> {
    const 칸 = (await this.driver.$$(this.투표항목들))[번호 - 1];
    return 칸 ? 칸.getText() : '';
  }

  async 투표항목수(): Promise<number> {
    return (await this.driver.$$(this.투표항목들)).length;
  }
}
