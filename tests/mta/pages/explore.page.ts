import { 하단탭 } from '../components/tab-bar.component.js';
import { 글자들, 보이나, 앱id, 뜰때까지, 위로밀기, type 앱 } from '../helpers/app.helper.js';

export class 둘러보기화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 탭: 하단탭;
  readonly 검색창 = 앱id('search_text');
  readonly QR스캔 = '~QR 코드 스캔';
  readonly 게시물탭 = '~게시물';
  readonly 해시태그탭 = '~해시태그';
  readonly 소식탭 = '~소식';
  readonly 추천탭 = '~추천';
  readonly 배너 = 앱id('banner_text');
  readonly 글본문들 = 앱id('text');

  constructor(private readonly driver: 앱) {
    this.탭 = new 하단탭(driver);
  }

  async 열기(): Promise<void> {
    await this.탭.누르기('둘러보기');
    await 뜰때까지(this.driver, this.검색창, 15_000);
  }

  async 보이나(선택자: string): Promise<boolean> {
    return 뜰때까지(this.driver, 선택자);
  }

  async 지금보이나(선택자: string): Promise<boolean> {
    return 보이나(this.driver, 선택자);
  }

  async 검색창글(): Promise<string> {
    return (await 글자들(this.driver, this.검색창)).join(', ');
  }

  async 탭누르기(탭: '게시물' | '해시태그' | '소식' | '추천'): Promise<void> {
    await this.driver.$(`~${탭}`).click();
  }

  async 검색창누르기(): Promise<void> {
    await this.driver.$(this.검색창).click();
  }

  async 같은탭다시누르기(): Promise<void> {
    await this.탭.누르기('둘러보기');
  }

  async 내리기(번수: number): Promise<void> {
    await 위로밀기(this.driver, 번수);
  }
}
