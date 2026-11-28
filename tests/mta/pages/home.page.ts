import type { AppDriver } from '@platform/kit/app';
import { 뜰때까지, 될때까지, 보이나, 요소안에서밀기 } from '@platform/kit/parts';

import { 하단탭 } from '../components/tabbar.component.js';
import { 글읽기, 누르기, 모든글자, 모든요소, 목록안글자포함, 앱id } from '../helpers/app.helper.js';

export class 홈화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';
  static readonly 설정아이콘 = 앱id('settings');
  static readonly 글쓰기버튼 = 앱id('fab');
  static readonly 목록 = 앱id('list');
  static readonly 글본문 = 앱id('text');
  static readonly 제목고르개 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/toolbar").childSelector(new UiSelector().className("android.widget.Spinner"))';
  static readonly 제목글자 = 'android=new UiSelector().resourceId("org.joinmastodon.android:id/toolbar").childSelector(new UiSelector().className("android.widget.Spinner")).childSelector(new UiSelector().className("android.widget.TextView"))';

  static readonly 실시간배너 = 앱id('banner_text');
  static readonly 목록관리아이콘 = 앱id('edit_list');
  static readonly 새게시물버튼 = 앱id('new_posts_btn');
  static readonly 오류글 = 앱id('error_text');
  static readonly 오류재시도 = 앱id('error_retry');
  static readonly 카드더보기 = 앱id('more');
  static readonly 드롭다운전체 = 'android=new UiSelector().className("android.widget.TextView")';

  static 드롭다운항목(글자: string): string {
    return `android=new UiSelector().className("android.widget.TextView").text(${JSON.stringify(글자)})`;
  }

  readonly 탭: 하단탭;

  constructor(private readonly driver: AppDriver) {
    this.탭 = new 하단탭(driver);
  }

  async 떴나(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, 홈화면.설정아이콘, 시간);
  }

  async 제목(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 홈화면.제목글자, 10_000))) return '';
    return this.driver.$(홈화면.제목글자).getText();
  }

  async 제목고르개있나(): Promise<boolean> {
    return 뜰때까지(this.driver, 홈화면.제목고르개, 5_000);
  }

  async 설정누르기(): Promise<void> {
    await this.driver.$(홈화면.설정아이콘).click();
  }

  async 글쓰기누르기(): Promise<void> {
    if (!(await 뜰때까지(this.driver, 홈화면.글쓰기버튼, 10_000))) throw new Error('홈 글쓰기 버튼이 안 보인다');
    await this.driver.$(홈화면.글쓰기버튼).click();
  }

  async 당겨서새로고침(): Promise<void> {
    await 요소안에서밀기(this.driver, 홈화면.목록, '아래');
  }

  async 아래로내리기(번 = 2): Promise<void> {
    for (let i = 0; i < 번; i++) await 요소안에서밀기(this.driver, 홈화면.목록, '위');
  }

  async 맨위글본문(): Promise<string> {
    if (!(await 뜰때까지(this.driver, 홈화면.글본문, 10_000))) return '';
    return this.driver.$(홈화면.글본문).getText();
  }

  async 맨위글인가(글자: string): Promise<boolean> {
    const 주소 = 목록안글자포함(글자);
    if (!(await 보이나(this.driver, 주소))) return false;
    const 글y = (await this.driver.$(주소).getLocation()).y;
    const 목록y = (await this.driver.$(홈화면.목록).getLocation()).y;
    return 글y - 목록y < 450;
  }

  async 맨위에올때까지(글자: string, 시간 = 20_000): Promise<boolean> {
    return 될때까지(this.driver, () => this.맨위글인가(글자), 시간);
  }

  async 새로고침해맨위에올때까지(글자: string, 시간 = 40_000): Promise<boolean> {
    return 될때까지(
      this.driver,
      async () => {
        if (await this.맨위글인가(글자)) return true;
        await this.당겨서새로고침();
        return this.맨위에올때까지(글자, 6_000);
      },
      시간,
    );
  }

  async 글보일때까지(글자: string, 시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, 목록안글자포함(글자), 시간);
  }

  async 드롭다운열기(): Promise<void> {
    await 누르기(this.driver, 홈화면.제목고르개, 10_000);
    if (!(await 뜰때까지(this.driver, 홈화면.드롭다운항목('팔로우 중인 해시태그'), 10_000))) throw new Error('홈 드롭다운이 안 열렸다');
  }

  async 드롭다운글들(): Promise<string[]> {
    return 모든글자(this.driver, 홈화면.드롭다운전체);
  }

  async 드롭다운항목있나(글자: string, 시간 = 3_000): Promise<boolean> {
    return 뜰때까지(this.driver, 홈화면.드롭다운항목(글자), 시간);
  }

  async 드롭다운항목누르기(글자: string): Promise<void> {
    await 누르기(this.driver, 홈화면.드롭다운항목(글자), 10_000);
  }

  async 드롭다운하위열기(이름: '목록' | '팔로우 중인 해시태그'): Promise<void> {
    await this.드롭다운항목누르기(이름);
    if (!(await this.드롭다운항목있나(`${이름}. 뒤로 가기`, 10_000))) throw new Error(`「${이름}」 하위가 안 열렸다`);
  }

  async 드롭다운닫기(): Promise<void> {
    await this.driver.back();
  }

  async 목록고르기(이름: string): Promise<void> {
    await this.드롭다운열기();
    await this.드롭다운하위열기('목록');
    await this.드롭다운항목누르기(이름);
    await 될때까지(this.driver, async () => (await this.제목()) === 이름, 15_000);
  }

  async 실시간피드고르기(): Promise<void> {
    await this.드롭다운열기();
    await this.드롭다운항목누르기('실시간 피드');
    await 뜰때까지(this.driver, 홈화면.실시간배너, 15_000);
  }

  async 실시간배너글(): Promise<string> {
    return 글읽기(this.driver, 홈화면.실시간배너, 10_000);
  }

  async 목록관리아이콘있나(시간 = 5_000): Promise<boolean> {
    return 뜰때까지(this.driver, 홈화면.목록관리아이콘, 시간);
  }

  async 새게시물버튼있나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 홈화면.새게시물버튼, 시간);
  }

  async 새게시물누르기(): Promise<void> {
    await 누르기(this.driver, 홈화면.새게시물버튼, 10_000);
  }

  async 오류재시도있나(시간 = 10_000): Promise<boolean> {
    return 뜰때까지(this.driver, 홈화면.오류재시도, 시간);
  }

  async 오류재시도누르기(): Promise<void> {
    await 누르기(this.driver, 홈화면.오류재시도, 10_000);
  }

  async 오류글읽기(): Promise<string> {
    return 글읽기(this.driver, 홈화면.오류글, 10_000);
  }

  async 보이는카드수(): Promise<number> {
    return (await 모든요소(this.driver, 홈화면.카드더보기)).length;
  }

  async 빈안내글(시간 = 15_000): Promise<string> {
    if (!(await 뜰때까지(this.driver, 앱id('empty_text'), 시간))) return '';
    return this.driver.$(앱id('empty_text')).getText();
  }
}
