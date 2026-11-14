import { 뜰때까지, 앱id, 앱꾸러미, 문구가보이나, type 앱 } from '../helpers/app.helper.js';

export class 공유받기화면 {
  static readonly 주소 = 'app:.MainActivity/org.joinmastodon.android:id/fragment_wrap';

  readonly 본문칸 = 앱id('toot_text');
  readonly 계정선택제목 = 'android=new UiSelector().text("계정 선택")';
  readonly 확인 = 'id=android:id/button1';
  readonly 취소 = 'id=android:id/button2';

  constructor(private readonly driver: 앱) {}

  async 글쓰기떴나(시간 = 20_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.본문칸, 시간);
  }

  async 본문글(): Promise<string> {
    const 칸 = await this.driver.$(this.본문칸);
    await 칸.waitForDisplayed({ timeout: 10_000 });
    return (await 칸.getText()).replace(/\r/g, '');
  }

  async 닫기(): Promise<void> {
    await this.driver.back();
    const 묻는창 = await this.driver
      .$(this.확인)
      .waitForDisplayed({ timeout: 3_000 })
      .then(
        () => true,
        () => false,
      );
    if (묻는창) await this.driver.$(this.확인).click();
  }

  async 앱이닫혔나(시간 = 10_000): Promise<boolean> {
    return this.driver
      .waitUntil(async () => (await this.driver.queryAppState(앱꾸러미)) !== 4, { timeout: 시간, interval: 500 })
      .then(
        () => true,
        () => false,
      );
  }

  async 계정선택창떴나(시간 = 15_000): Promise<boolean> {
    return 뜰때까지(this.driver, this.계정선택제목, 시간);
  }

  async 계정줄이보이나(시간 = 5_000): Promise<boolean> {
    return 문구가보이나(this.driver, '@<이름>@<서버>', 시간);
  }

  async 계정선택취소누르기(): Promise<void> {
    await this.driver.$(this.취소).click();
  }

  async 계정선택창닫혔나(시간 = 10_000): Promise<boolean> {
    return this.driver
      .$(this.계정선택제목)
      .waitForDisplayed({ timeout: 시간, reverse: true })
      .then(
        () => true,
        () => false,
      );
  }
}
