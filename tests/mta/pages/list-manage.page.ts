import { 홈화면 } from './home.page.js';
import { 확인창 } from '../components/dialog.component.js';
import { 메뉴 } from '../components/menu.component.js';
import { 글자로고르기, 문구가보이나, 앱id, 뜰때까지, type 앱 } from '../helpers/app.helper.js';
import { 목록글자, 정확글누르기, 정확글보이나 } from '../helpers/settings.helper.js';

export class 목록관리화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 줄제목들 = 앱id('title');
  readonly 옵션들 = 앱id('options_btn');
  readonly 만들기 = '~목록 만들기';

  readonly 홈: 홈화면;
  readonly 메뉴: 메뉴;
  readonly 확인: 확인창;

  constructor(private readonly driver: 앱) {
    this.홈 = new 홈화면(driver);
    this.메뉴 = new 메뉴(driver);
    this.확인 = new 확인창(driver);
  }

  async 홈에서열기(): Promise<void> {
    await this.홈.드롭다운열기();
    await 정확글누르기(this.driver, '목록');
    await 정확글누르기(this.driver, '목록 관리');
  }

  async 떴나(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.만들기, 시간);
  }

  async 제목보이나(): Promise<boolean> {
    return 정확글보이나(this.driver, '목록 관리', 5_000);
  }

  async 줄이름들(): Promise<string[]> {
    return 목록글자(this.driver, this.줄제목들);
  }

  async 만들기누르기(): Promise<void> {
    await this.driver.$(this.만들기).click();
  }

  async 옵션누르기(이름: string): Promise<void> {
    const 제목 = await 글자로고르기(this.driver, this.줄제목들, 이름);
    const 높이 = (await 제목.getLocation()).y;
    const 담음: { 요소?: WebdriverIO.Element; 거리: number } = { 거리: Number.POSITIVE_INFINITY };
    for (const 후보 of await this.driver.$$(this.옵션들)) {
      const 거리 = Math.abs((await 후보.getLocation()).y - 높이);
      if (거리 < 담음.거리) {
        담음.요소 = 후보;
        담음.거리 = 거리;
      }
    }
    if (!담음.요소) throw new Error(`「${이름}」 줄의 추가 옵션 단추를 찾지 못했다`);
    await 담음.요소.click();
  }

  async 옵션메뉴글자(이름: string): Promise<string[]> {
    await this.옵션누르기(이름);
    return this.메뉴.항목글자();
  }

  async 편집열기(이름: string): Promise<void> {
    await this.옵션누르기(이름);
    await this.메뉴.고르기('목록 관리');
  }

  async 삭제창열기(이름: string): Promise<boolean> {
    await this.옵션누르기(이름);
    await this.메뉴.고르기('리스트 삭제');
    return this.확인.떴나();
  }

  async 삭제하기(이름: string): Promise<void> {
    if (!(await this.삭제창열기(이름))) throw new Error('목록 삭제 확인 창이 뜨지 않았다');
    await this.확인.확인누르기();
  }

  async 홈에서지우기(이름: string): Promise<void> {
    await this.홈에서열기();
    if (!(await this.떴나())) throw new Error('목록 관리 화면이 열리지 않았다');
    await this.삭제하기(이름);
  }

  async 글보이나(문구: string): Promise<boolean> {
    return 문구가보이나(this.driver, 문구, 5_000);
  }

  async 삭제단추글(): Promise<string> {
    return this.driver.$(this.확인.확인).getText();
  }

  async 취소단추글(): Promise<string> {
    return this.driver.$(this.확인.취소).getText();
  }
}
