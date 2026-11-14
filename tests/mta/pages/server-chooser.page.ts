import { 글자들, 글자로고르기, 보이나, 뜰때까지, 앱id, type 앱 } from '../helpers/app.helper.js';

const 정확글자 = (글: string): string => `android=new UiSelector().text(${JSON.stringify(글)})`;

export class 서버고르기화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 입력칸 = 앱id('search_edit');
  readonly 카드제목들 = 앱id('title');
  readonly 다음 = 앱id('btn_next');
  readonly 초대링크 = 앱id('btn_use_invite');
  readonly 필터줄 = 앱id('filters_scroll');
  readonly 초대입력칸 = 'android.widget.EditText';

  constructor(private readonly driver: 앱) {}

  async 떴나(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.입력칸, 시간);
  }

  async 힌트(): Promise<string> {
    return this.driver.$(this.입력칸).getText();
  }

  async 카드글자들(): Promise<string[]> {
    return 글자들(this.driver, this.카드제목들);
  }

  async 서버적기(글: string): Promise<void> {
    const 전 = (await this.카드글자들()).join('\n');
    const 칸 = await this.driver.$(this.입력칸);
    await 칸.click();
    await 칸.setValue(글);
    await this.driver
      .waitUntil(async () => (await this.카드글자들()).join('\n') !== 전, { timeout: 8_000, interval: 500 })
      .catch(() => undefined);
  }

  async 카드누르기(서버: string): Promise<void> {
    await (await 글자로고르기(this.driver, this.카드제목들, 서버, 20_000)).click();
  }

  async 입력하고카드고르기(글: string, 카드: string): Promise<void> {
    await this.서버적기(글);
    const 카드요소 = await 글자로고르기(this.driver, this.카드제목들, 카드, 8_000).catch(() => undefined);
    if (카드요소) await 카드요소.click();
  }

  async 맨위카드가될때까지(서버: string, 시간 = 20_000): Promise<boolean> {
    return this.driver
      .waitUntil(async () => (await this.카드글자들())[0] === 서버, { timeout: 시간, interval: 500 })
      .then(
        () => true,
        () => false,
      );
  }

  async 카드목록이뜰때까지(시간 = 20_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.카드제목들, 시간);
  }

  async 다음켜졌나(): Promise<boolean> {
    return (await this.driver.$(this.다음).getAttribute('enabled')) === 'true';
  }

  async 다음누르기(): Promise<void> {
    await this.driver.$(this.다음).click();
  }

  async 초대링크글(): Promise<string> {
    return this.driver.$(this.초대링크).getText();
  }

  async 초대링크누르기(): Promise<void> {
    await this.driver.$(this.초대링크).click();
  }

  async 초대주소넣기(주소: string): Promise<void> {
    const 칸 = await this.driver.$(this.초대입력칸);
    await 칸.waitForDisplayed({ timeout: 10_000 });
    await 칸.setValue(주소);
  }

  async 필터줄이보이나(): Promise<boolean> {
    return 보이나(this.driver, this.필터줄);
  }

  async 필터줄밀기(): Promise<void> {
    const 줄 = await this.driver.$(this.필터줄);
    await this.driver.execute('mobile: swipeGesture', { elementId: 줄.elementId, direction: 'left', percent: 0.9 });
  }

  async 칩누르기(글: string): Promise<void> {
    await this.driver.$(정확글자(글)).click();
  }

  async 글자가보이나(글: string, 시간 = 5_000): Promise<boolean> {
    return 뜰때까지(this.driver, 정확글자(글), 시간);
  }
}
