import { type 앱, type 요소, 글들, 켜졌나 } from '../helpers/app.helper.js';

export type 분류 = '전체' | '패션' | '전자기기' | '도서' | '식품';

const 분류주소: Record<분류, string> = {
  전체: 'id=category_all',
  패션: 'id=category_fashion',
  전자기기: 'id=category_digital',
  도서: 'id=category_book',
  식품: 'id=category_food',
};

export const 분류들: 분류[] = ['전체', '패션', '전자기기', '도서', '식품'];

export class 상품목록화면 {
  static readonly 주소 = 'app:.MainActivity/product_list';

  constructor(private readonly driver: 앱) {}

  get 목록() {
    return this.driver.$('id=product_list');
  }

  get 장바구니버튼() {
    return this.driver.$('id=cart_button');
  }

  get 주문내역버튼() {
    return this.driver.$('id=orders_button');
  }

  get 로그아웃버튼() {
    return this.driver.$('id=logout_button');
  }

  get 총개수() {
    return this.driver.$('id=product_total');
  }

  분류칩(이름: 분류) {
    return this.driver.$(분류주소[이름]);
  }

  async 열릴때까지(timeout = 30000): Promise<void> {
    await this.목록.waitForDisplayed({ timeout });
    await this.driver.$('id=product_item').waitForDisplayed({ timeout });
  }

  async 보이나(): Promise<boolean> {
    return this.목록.isDisplayed();
  }

  async 장바구니버튼글(): Promise<string> {
    return this.장바구니버튼.$('android.widget.TextView').getText();
  }

  async 장바구니수(): Promise<number> {
    const 찾음 = /(\d+)/.exec(await this.장바구니버튼글());
    return 찾음 === null ? Number.NaN : Number(찾음[1]);
  }

  async 장바구니수가될때까지(수: number, timeout = 15000): Promise<void> {
    await this.driver.waitUntil(async () => (await this.장바구니수()) === 수, {
      timeout,
      interval: 300,
      timeoutMsg: `「장바구니 ${String(수)}」이 되지 않았다`,
    });
  }

  async 장바구니누르기(): Promise<void> {
    await this.장바구니버튼.click();
  }

  async 주문내역누르기(): Promise<void> {
    await this.주문내역버튼.click();
  }

  async 로그아웃누르기(): Promise<void> {
    await this.로그아웃버튼.click();
  }

  async 분류칩골라졌나(이름: 분류): Promise<boolean> {
    return 켜졌나(await this.분류칩(이름).getElement());
  }

  async 분류칩이름(이름: 분류): Promise<string> {
    return this.분류칩(이름).$('android.widget.TextView').getText();
  }

  async 분류칩세로자리(이름: 분류): Promise<number> {
    return (await this.분류칩(이름).getLocation()).y;
  }

  async 분류칩가로자리(이름: 분류): Promise<number> {
    return (await this.분류칩(이름).getLocation()).x;
  }

  async 분류누르기(이름: 분류): Promise<void> {
    await this.분류칩(이름).click();
  }

  async 분류고르기(이름: 분류): Promise<void> {
    await this.분류누르기(이름);
    await this.driver.waitUntil(async () => this.분류칩골라졌나(이름), { timeout: 15000, interval: 300 });
    await this.열릴때까지();
  }

  async 총개수글(): Promise<string> {
    return this.총개수.getText();
  }

  async 카드들(): Promise<요소[]> {
    return [...(await this.driver.$$('id=product_item'))];
  }

  async 보이는상품이름들(): Promise<string[]> {
    const 모음: string[] = [];
    for (const 칸 of await this.driver.$$('id=product_name')) 모음.push(await 칸.getText());
    return 모음;
  }

  async 보이는판매가들(): Promise<string[]> {
    const 모음: string[] = [];
    for (const 칸 of await this.driver.$$('id=product_price')) 모음.push(await 칸.getText());
    return 모음;
  }

  async 첫상품이름(): Promise<string> {
    return this.driver.$('id=product_name').getText();
  }

  async 카드상품이름(카드: 요소): Promise<string> {
    const 이름 = await 카드.$('id=product_name');
    return (await 이름.isExisting()) ? 이름.getText() : '';
  }

  async 카드글들(카드: 요소): Promise<string[]> {
    return 글들(카드);
  }

  async 카드품절글(카드: 요소): Promise<string> {
    return 카드.$('id=sold_out_label').getText();
  }

  async 아래로밀기(): Promise<void> {
    await this.driver.swipe({ direction: 'up', scrollableElement: await this.목록.getElement(), percent: 0.6 });
  }

  async 위로밀기(): Promise<void> {
    await this.driver.swipe({ direction: 'down', scrollableElement: await this.목록.getElement(), percent: 0.8 });
  }

  async 상품카드찾기(이름: string, 최대밀기 = 15): Promise<요소> {
    for (let 번 = 0; 번 <= 최대밀기; 번 += 1) {
      for (const 카드 of await this.카드들()) {
        if ((await this.카드상품이름(카드)) === 이름) return 카드;
      }
      await this.아래로밀기();
    }
    throw new Error(`상품 목록에서 「${이름}」 카드를 찾지 못했다`);
  }

  async 상품열기(이름: string): Promise<void> {
    await (await this.상품카드찾기(이름)).click();
  }

  async 첫상품열기(): Promise<void> {
    await this.driver.$('id=product_item').click();
  }

  async 끝까지모은상품이름들(최대밀기 = 20): Promise<string[]> {
    const 모음: string[] = [];
    let 그대로 = 0;
    for (let 번 = 0; 번 < 최대밀기 && 그대로 < 2; 번 += 1) {
      const 앞수 = 모음.length;
      for (const 이름 of await this.보이는상품이름들()) if (!모음.includes(이름)) 모음.push(이름);
      그대로 = 모음.length === 앞수 ? 그대로 + 1 : 0;
      await this.아래로밀기();
    }
    return 모음;
  }
}
