import { 메뉴 } from '../components/menu.component.js';
import { 글자가든요소, 글자들, 보이나, 앱id, 뒤로, 뜰때까지, type 앱 } from '../helpers/app.helper.js';
import { 글자누르기, 글자요소찾기, 이미지버튼들, 칸글자수, 확인창이면누르기 } from '../helpers/profile.helper.js';

export class 프로필편집화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 메뉴: 메뉴;
  readonly 동작버튼 = 앱id('profile_action_btn');
  readonly 헤더이미지 = '~헤더 이미지';
  readonly 아바타 = '~프로필 이미지';
  readonly 편집표식 = 앱id('cover_badge');
  readonly 입력칸 = 'android.widget.EditText';
  readonly 제외버튼설명 = ['상위 메뉴로 이동', '뒤로 가기', '옵션 더보기'];

  constructor(private readonly driver: 앱) {
    this.메뉴 = new 메뉴(driver);
  }

  async 열기(): Promise<boolean> {
    await this.driver.$(this.동작버튼).click();
    return 뜰때까지(this.driver, this.편집표식, 20_000);
  }

  async 줄누르기(글조각: string): Promise<void> {
    await (await 글자가든요소(this.driver, 글조각)).click();
  }

  async 보이나(선택자: string): Promise<boolean> {
    return 보이나(this.driver, 선택자);
  }

  async 칸뜰때까지(): Promise<boolean> {
    return 뜰때까지(this.driver, this.입력칸, 15_000);
  }

  async 칸적기(글: string): Promise<void> {
    await this.driver.$(this.입력칸).setValue(글);
  }

  async 칸비우기(): Promise<void> {
    await this.driver.$(this.입력칸).clearValue();
  }

  async 칸글자수(): Promise<number> {
    return 칸글자수(this.driver, this.입력칸);
  }

  async 칸글(): Promise<string> {
    return (await 글자들(this.driver, this.입력칸)).join(', ');
  }

  async 저장켜짐(): Promise<string | null> {
    const 버튼 = await 글자요소찾기(this.driver, '저장');
    if (!버튼) throw new Error('「저장」 버튼을 찾지 못했다');
    return 버튼.getAttribute('enabled');
  }

  async 저장누르기(): Promise<void> {
    await 글자누르기(this.driver, '저장');
  }

  async 나가기(): Promise<void> {
    await 뒤로(this.driver);
    await 확인창이면누르기(this.driver);
  }

  async 이미지누르기(무엇: '헤더' | '아바타'): Promise<void> {
    await this.driver.$(무엇 === '헤더' ? this.헤더이미지 : this.아바타).click();
  }

  async 팝업항목들(): Promise<string[]> {
    return this.메뉴.항목글자();
  }

  async 팝업고르기(글자: string): Promise<void> {
    await this.메뉴.고르기(글자);
  }

  async 삭제버튼누르기(): Promise<void> {
    const [첫] = await 이미지버튼들(this.driver, this.제외버튼설명);
    if (!첫) throw new Error('줄의 삭제 버튼을 찾지 못했다');
    await 첫.click();
  }
}
