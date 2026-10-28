import { type 앱, 칸에적기 } from '../helpers/app.helper.js';

export class 주소검색창 {
  static readonly 주소 = 'app:.MainActivity/address_keyword';

  constructor(private readonly driver: 앱) {}

  get 검색어칸() {
    return this.driver.$('id=address_keyword');
  }

  get 검색버튼() {
    return this.driver.$('id=address_find');
  }

  get 결과없음() {
    return this.driver.$('id=address_empty');
  }

  get 닫기버튼() {
    return this.driver.$('id=dialog_cancel');
  }

  async 열릴때까지(timeout = 10000): Promise<void> {
    await this.검색어칸.waitForDisplayed({ timeout });
  }

  async 보이나(): Promise<boolean> {
    return this.검색어칸.isDisplayed();
  }

  async 닫힐때까지(timeout = 10000): Promise<void> {
    await this.검색어칸.waitForDisplayed({ timeout, reverse: true });
  }

  async 검색어칸이름(): Promise<string> {
    return this.검색어칸.$('android.widget.TextView').getText();
  }

  async 주소찾기(검색어: string): Promise<void> {
    await 칸에적기(await this.검색어칸.getElement(), 검색어);
    await this.driver.hideKeyboard().catch(() => undefined);
    await this.검색버튼.click();
  }

  async 결과나올때까지(timeout = 15000): Promise<void> {
    await this.driver.waitUntil(
      async () => (await this.driver.$('id=address_result').isDisplayed()) || (await this.결과없음.isDisplayed()),
      { timeout, interval: 300, timeoutMsg: '주소 검색 결과가 그려지지 않았다' },
    );
  }

  async 결과줄글들(): Promise<string[]> {
    const 모음: string[] = [];
    for (const 줄 of await this.driver.$$('id=address_result')) 모음.push(await 줄.getText());
    return 모음;
  }

  async 결과없음보이나(): Promise<boolean> {
    return this.결과없음.isDisplayed();
  }

  async 결과없음글(): Promise<string> {
    return this.결과없음.getText();
  }

  async 첫결과고르기(): Promise<string> {
    const 줄 = await this.driver.$('id=address_result');
    const 글 = await 줄.getText();
    await 줄.click();
    await this.닫힐때까지();
    return 글;
  }

  async 닫기(): Promise<void> {
    await this.닫기버튼.click();
    await this.닫힐때까지();
  }
}
