import { 기다림, 글들, 밀어서찾기, 한번밀기, type 앱 } from '../helpers/app.helper.js';

export class 주문내역화면 {
  static readonly 주소 = 'app:.MainActivity/order_list';

  constructor(private readonly driver: 앱) {}

  get 첫카드() {
    return this.driver.$('~order_item');
  }

  카드선택자(주문번호: string): string {
    return `//android.view.View[@resource-id="order_item"][.//android.widget.TextView[@resource-id="order_id" and @text="${주문번호}"]]`;
  }

  async 열릴때까지(시간 = 기다림 * 2): Promise<boolean> {
    return this.첫카드.waitForDisplayed({ timeout: 시간 }).then(() => true, () => false);
  }

  async 보이는가(): Promise<boolean> {
    return this.driver.$('~order_list').isDisplayed().catch(() => false);
  }

  async 보이는주문번호(): Promise<string[]> {
    return 글들(this.driver, '~order_id');
  }

  async 카드찾기(주문번호: string): Promise<boolean> {
    return 밀어서찾기(this.driver, this.카드선택자(주문번호));
  }

  async 카드글들(주문번호: string): Promise<string[]> {
    return 글들(this.driver, `${this.카드선택자(주문번호)}//android.widget.TextView`);
  }

  async 카드에글있나(주문번호: string, 글: string): Promise<boolean> {
    return (await this.카드글들(주문번호)).join(' ').includes(글);
  }

  async 주문열기(주문번호: string): Promise<void> {
    if (!(await this.카드찾기(주문번호))) throw new Error(`주문 내역에서 「${주문번호}」 카드를 찾지 못했다`);
    await this.driver.$(this.카드선택자(주문번호)).click();
  }

  async 첫카드누르기(): Promise<void> {
    await this.첫카드.click();
  }

  async 끝까지모으기(최대 = 15): Promise<string[]> {
    const 모음: string[] = [];
    let 그대로 = 0;
    for (let i = 0; i < 최대 && 그대로 < 2; i += 1) {
      const 앞 = 모음.length;
      for (const 번호 of await this.보이는주문번호()) if (!모음.includes(번호)) 모음.push(번호);
      그대로 = 모음.length === 앞 ? 그대로 + 1 : 0;
      await 한번밀기(this.driver);
    }
    return 모음;
  }
}
