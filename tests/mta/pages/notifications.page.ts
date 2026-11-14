import { 하단탭 } from '../components/tab-bar.component.js';
import { 글자들, 글자가든요소, 앱id, 뜰때까지, 사라질때까지, 위로밀기, type 앱 } from '../helpers/app.helper.js';

export class 알림화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 탭: 하단탭;
  readonly 모두읽음 = '~모두 읽은 상태로 표시';
  readonly 제외조건 = '~알림 제외 조건...';
  readonly 모든것탭 = 앱id('all_tab');
  readonly 멘션탭 = 앱id('mentions_tab');
  readonly 모든것글자 = 앱id('all_text');
  readonly 멘션글자 = 앱id('mentions_text');
  readonly 줄글들 = 앱id('text');
  readonly 제목들 = 앱id('title');
  readonly 확정 = 앱id('notification_approve');
  readonly 삭제 = 앱id('notification_decline');
  readonly 글상세 = 앱id('reply_button');

  constructor(private readonly driver: 앱) {
    this.탭 = new 하단탭(driver);
  }

  async 열기(): Promise<void> {
    await this.탭.누르기('알림');
    await this.떴나();
  }

  async 떴나(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.모두읽음, 시간);
  }

  async 선택됨(이름: '모든 것' | '멘션'): Promise<string | null> {
    return this.driver.$(이름 === '모든 것' ? this.모든것탭 : this.멘션탭).getAttribute('selected');
  }

  async 멘션탭열기(): Promise<void> {
    await this.driver.$(this.멘션탭).click();
    await 뜰때까지(this.driver, this.줄글들);
  }

  async 모든것탭열기(): Promise<void> {
    await this.driver.$(this.모든것탭).click();
    await 뜰때까지(this.driver, this.줄글들);
  }

  async 줄글읽기(): Promise<string[]> {
    await 뜰때까지(this.driver, this.줄글들);
    return 글자들(this.driver, this.줄글들);
  }

  async 멘션아닌줄수(): Promise<number> {
    return (await this.줄글읽기()).filter((글) => /님이 |당신의 |개의 즐겨찾기|방금 게시함/.test(글)).length;
  }

  async 멘션줄수(): Promise<number> {
    return (await this.줄글읽기()).filter((글) => ['멘션', '답장', '개인 멘션', '개인 답변'].includes(글)).length;
  }

  async 글누르기(글조각: string): Promise<void> {
    await (await 글자가든요소(this.driver, 글조각)).click();
  }

  async 제외조건열기(): Promise<void> {
    await this.driver.$(this.제외조건).click();
  }

  async 글상세떴나(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.글상세, 시간);
  }

  async 내리기(번수: number): Promise<void> {
    await 위로밀기(this.driver, 번수);
  }

  async 모두읽음누르기(): Promise<void> {
    await this.driver.$(this.모두읽음).click();
  }

  async 배지사라졌나(): Promise<boolean> {
    return 사라질때까지(this.driver, this.탭.알림배지);
  }

  async 보이나(선택자: string): Promise<boolean> {
    return 뜰때까지(this.driver, 선택자);
  }

  async 확정누르기(): Promise<void> {
    await this.driver.$(this.확정).click();
  }

  async 삭제누르기(): Promise<void> {
    await this.driver.$(this.삭제).click();
  }

  async 확정사라졌나(): Promise<boolean> {
    return 사라질때까지(this.driver, this.확정);
  }

  async 삭제사라졌나(): Promise<boolean> {
    return 사라질때까지(this.driver, this.삭제);
  }

  async 줄글에있나(글: string): Promise<boolean> {
    return (await this.줄글읽기()).includes(글);
  }

  async 첫줄글(): Promise<string> {
    return (await this.줄글읽기())[0] ?? '';
  }
}
