import { 하단탭 } from '../components/tab-bar.component.js';
import { 글자가든요소, 글자들, 앱id, 뜰때까지, type 앱 } from '../helpers/app.helper.js';
import { 키보드검색 } from '../helpers/profile.helper.js';

export class 검색화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 탭: 하단탭;
  readonly 입력칸 = 'android.widget.EditText';
  readonly 빈문구 = 앱id('empty_text');
  readonly 게시물탭 = '~게시물';
  readonly 해시태그탭 = '~해시태그';
  readonly 사람탭 = '~사람';

  constructor(private readonly driver: 앱) {
    this.탭 = new 하단탭(driver);
  }

  async 열기(): Promise<void> {
    await this.탭.누르기('둘러보기');
    await this.driver.$(앱id('search_text')).click();
    await 뜰때까지(this.driver, this.입력칸, 15_000);
  }

  async 적기(글: string): Promise<void> {
    await this.driver.$(this.입력칸).setValue(글);
  }

  async 비우기(): Promise<void> {
    await this.driver.$(this.입력칸).clearValue();
  }

  async 검색하기(글: string): Promise<void> {
    await this.적기(글);
    await 키보드검색(this.driver);
  }

  async 입력칸글(): Promise<string> {
    await 뜰때까지(this.driver, this.입력칸);
    return (await 글자들(this.driver, this.입력칸)).join(', ');
  }

  async 보이나(선택자: string): Promise<boolean> {
    return 뜰때까지(this.driver, 선택자);
  }

  async 줄누르기(글조각: string): Promise<void> {
    await (await 글자가든요소(this.driver, 글조각)).click();
  }

  async 빈문구글(): Promise<string> {
    await 뜰때까지(this.driver, this.빈문구);
    return (await 글자들(this.driver, this.빈문구)).join(', ');
  }

  async 탭누르기(이름: '게시물' | '해시태그' | '사람'): Promise<void> {
    await this.driver.$(`~${이름}`).click();
  }
}
