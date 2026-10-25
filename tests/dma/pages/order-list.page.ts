import { type 앱, type 요소, 글들 } from '../helpers/app.helper.js';

export class 주문내역화면 {
  static readonly 주소 = 'app:.MainActivity/order_list';

  constructor(private readonly driver: 앱) {}

  get 목록() {
    return this.driver.$('id=order_list');
  }

  async 열릴때까지(timeout = 30000): Promise<void> {
    await this.driver.$('id=order_item').waitForDisplayed({ timeout });
  }

  async 보이나(): Promise<boolean> {
    return this.목록.isDisplayed();
  }

  async 카드들(): Promise<요소[]> {
    return [...(await this.driver.$$('id=order_item'))];
  }

  async 카드글들(카드: 요소): Promise<string[]> {
    return 글들(카드);
  }

  async 카드주문번호(카드: 요소): Promise<string> {
    return 카드.$('id=order_id').getText();
  }

  async 카드상태(카드: 요소): Promise<string> {
    return 카드.$('id=order_status').getText();
  }

  async 카드주문번호보이나(카드: 요소): Promise<boolean> {
    return 카드.$('id=order_id').isDisplayed();
  }

  async 카드상태보이나(카드: 요소): Promise<boolean> {
    return 카드.$('id=order_status').isDisplayed();
  }

  async 아래로밀기(): Promise<void> {
    await this.driver.swipe({ direction: 'up', scrollableElement: await this.목록.getElement(), percent: 0.6 });
  }

  private async 카드찾기(맞나: (카드: 요소) => Promise<boolean>, 최대밀기 = 10): Promise<요소 | undefined> {
    for (let 번 = 0; 번 <= 최대밀기; 번 += 1) {
      for (const 카드 of await this.카드들()) if (await 맞나(카드)) return 카드;
      if (번 < 최대밀기) await this.아래로밀기();
    }
    return undefined;
  }

  async 주문번호로찾기(번호: string): Promise<요소 | undefined> {
    return this.카드찾기(async (카드) => (await this.카드주문번호(카드)) === 번호);
  }

  async 상태로찾기(상태: string): Promise<요소 | undefined> {
    return this.카드찾기(async (카드) => (await this.카드상태(카드)) === 상태);
  }

  async 끝까지모은카드글(최대밀기 = 10): Promise<string[][]> {
    const 모음: string[][] = [];
    const 본번호: string[] = [];
    let 그대로 = 0;
    for (let 번 = 0; 번 < 최대밀기 && 그대로 < 2; 번 += 1) {
      const 앞수 = 본번호.length;
      for (const 카드 of await this.카드들()) {
        const 번호 = await this.카드주문번호(카드);
        if (!본번호.includes(번호)) {
          본번호.push(번호);
          모음.push(await this.카드글들(카드));
        }
      }
      그대로 = 본번호.length === 앞수 ? 그대로 + 1 : 0;
      await this.아래로밀기();
    }
    return 모음;
  }

  async 주문열기(카드: 요소): Promise<void> {
    await 카드.click();
  }
}
