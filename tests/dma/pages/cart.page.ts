import { type 앱, type 요소, 글들, 금액, 켜졌나 } from '../helpers/app.helper.js';

export class 장바구니화면 {
  static readonly 주소 = 'app:.MainActivity/cart_list';

  constructor(private readonly driver: 앱) {}

  get 전체선택() {
    return this.driver.$('id=select_all');
  }

  get 선택삭제버튼() {
    return this.driver.$('id=delete_selected');
  }

  get 상품금액() {
    return this.driver.$('id=goods_amount');
  }

  get 배송비() {
    return this.driver.$('id=shipping_fee');
  }

  get 무료배송안내() {
    return this.driver.$('id=free_shipping_hint');
  }

  get 결제예정금액() {
    return this.driver.$('id=pay_amount');
  }

  get 주문하기버튼() {
    return this.driver.$('id=order_button');
  }

  get 빈안내() {
    return this.driver.$('id=cart_empty');
  }

  get 쇼핑하러가기버튼() {
    return this.driver.$('id=go_shopping_button');
  }

  get 확인창글() {
    return this.driver.$('id=dialog_message');
  }

  get 확인창취소() {
    return this.driver.$('id=dialog_cancel');
  }

  get 확인창삭제() {
    return this.driver.$('id=dialog_confirm');
  }

  async 열릴때까지(timeout = 30000): Promise<void> {
    await this.driver.waitUntil(async () => (await this.전체선택.isDisplayed()) || (await this.빈안내.isDisplayed()), {
      timeout,
      interval: 300,
      timeoutMsg: '장바구니 화면이 그려지지 않았다',
    });
  }

  async 보이나(): Promise<boolean> {
    return (await this.전체선택.isDisplayed()) || (await this.빈안내.isDisplayed());
  }

  async 줄들(): Promise<요소[]> {
    return [...(await this.driver.$$('id=cart_item'))];
  }

  async 줄수(): Promise<number> {
    return (await this.줄들()).length;
  }

  async 줄이름(줄: 요소): Promise<string> {
    return 줄.$('id=cart_item_name').getText();
  }

  async 줄이름들(): Promise<string[]> {
    const 모음: string[] = [];
    for (const 줄 of await this.줄들()) 모음.push(await this.줄이름(줄));
    return 모음;
  }

  async 줄찾기(이름: string): Promise<요소 | undefined> {
    for (const 줄 of await this.줄들()) if ((await this.줄이름(줄)) === 이름) return 줄;
    return undefined;
  }

  async 줄꼭찾기(이름: string): Promise<요소> {
    const 줄 = await this.줄찾기(이름);
    if (줄 === undefined) throw new Error(`장바구니에 「${이름}」 줄이 없다`);
    return 줄;
  }

  async 줄글들(줄: 요소): Promise<string[]> {
    return 글들(줄);
  }

  줄체크(줄: 요소) {
    return 줄.$('id=cart_check');
  }

  async 줄체크했나(줄: 요소): Promise<boolean> {
    return 켜졌나(await this.줄체크(줄).getElement());
  }

  async 줄체크누르기(줄: 요소): Promise<void> {
    await this.줄체크(줄).click();
  }

  async 줄금액(줄: 요소): Promise<number> {
    return 금액(await 줄.$('id=cart_item_price').getText());
  }

  async 줄수량(줄: 요소): Promise<number> {
    return Number(await 줄.$('id=cart_qty_value').getText());
  }

  async 줄요소들보이나(줄: 요소): Promise<Record<'체크박스' | '상품명' | '줄금액' | '빼기' | '수량' | '더하기', boolean>> {
    return {
      체크박스: await 줄.$('id=cart_check').isDisplayed(),
      상품명: await 줄.$('id=cart_item_name').isDisplayed(),
      줄금액: await 줄.$('id=cart_item_price').isDisplayed(),
      빼기: await 줄.$('id=cart_qty_minus').isDisplayed(),
      수량: await 줄.$('id=cart_qty_value').isDisplayed(),
      더하기: await 줄.$('id=cart_qty_plus').isDisplayed(),
    };
  }

  async 줄더하기(줄: 요소): Promise<void> {
    await 줄.$('id=cart_qty_plus').click();
  }

  async 줄빼기(줄: 요소): Promise<void> {
    await 줄.$('id=cart_qty_minus').click();
  }

  async 줄더하기눌리나(줄: 요소): Promise<boolean> {
    return 줄.$('id=cart_qty_plus').isEnabled();
  }

  async 줄빼기눌리나(줄: 요소): Promise<boolean> {
    return 줄.$('id=cart_qty_minus').isEnabled();
  }

  async 수량이될때까지(이름: string, 수: number, timeout = 15000): Promise<void> {
    await this.driver.waitUntil(async () => (await this.줄수량(await this.줄꼭찾기(이름))) === 수, {
      timeout,
      interval: 300,
      timeoutMsg: `「${이름}」 줄 수량이 ${String(수)}이 되지 않았다`,
    });
  }

  async 전체선택했나(): Promise<boolean> {
    return 켜졌나(await this.전체선택.getElement());
  }

  async 전체선택누르기(): Promise<void> {
    await this.전체선택.click();
  }

  async 체크한줄수(): Promise<number> {
    let 수 = 0;
    for (const 줄 of await this.줄들()) if (await this.줄체크했나(줄)) 수 += 1;
    return 수;
  }

  async 모두끄기(): Promise<void> {
    if (await this.전체선택했나()) await this.전체선택누르기();
    await this.driver.waitUntil(async () => (await this.체크한줄수()) === 0, { timeout: 10000, interval: 300 });
  }

  async 한줄만체크(이름: string): Promise<void> {
    await this.모두끄기();
    await this.줄체크누르기(await this.줄꼭찾기(이름));
    await this.driver.waitUntil(async () => (await this.체크한줄수()) === 1, { timeout: 10000, interval: 300 });
  }

  async 상품금액값(): Promise<number> {
    return 금액(await this.상품금액.getText());
  }

  async 상품금액이바뀔때까지(앞값: number, timeout = 15000): Promise<void> {
    await this.driver.waitUntil(async () => (await this.상품금액값()) !== 앞값, { timeout, interval: 300 });
  }

  async 배송비글(): Promise<string> {
    return this.배송비.getText();
  }

  async 무료배송글(): Promise<string> {
    return this.무료배송안내.getText();
  }

  async 결제예정금액값(): Promise<number> {
    return 금액(await this.결제예정금액.getText());
  }

  async 아래금액줄보이나(): Promise<Record<'상품금액' | '배송비' | '결제예정금액', boolean>> {
    return {
      상품금액: await this.상품금액.isDisplayed(),
      배송비: await this.배송비.isDisplayed(),
      결제예정금액: await this.결제예정금액.isDisplayed(),
    };
  }

  async 아래금액줄글들(): Promise<string[]> {
    return [await this.상품금액.getText(), await this.배송비.getText(), await this.결제예정금액.getText()];
  }

  async 주문하기눌리나(): Promise<boolean> {
    return this.주문하기버튼.isEnabled();
  }

  async 주문하기누르기(): Promise<void> {
    await this.주문하기버튼.click();
  }

  async 선택삭제누르기(): Promise<void> {
    await this.선택삭제버튼.click();
  }

  async 확인창뜰때까지(timeout = 10000): Promise<void> {
    await this.확인창글.waitForDisplayed({ timeout });
  }

  async 확인창보이나(): Promise<boolean> {
    return this.확인창글.isDisplayed();
  }

  async 확인창글읽기(): Promise<string> {
    await this.확인창뜰때까지();
    return this.확인창글.getText();
  }

  async 확인창닫기(): Promise<void> {
    await this.확인창취소.click();
    await this.확인창글.waitForDisplayed({ timeout: 10000, reverse: true });
  }

  async 확인창삭제누르기(): Promise<void> {
    await this.확인창삭제.click();
  }

  async 빈안내보이나(): Promise<boolean> {
    return this.빈안내.isDisplayed();
  }

  async 빈안내글(): Promise<string> {
    return this.빈안내.getText();
  }

  async 쇼핑하러가기보이나(): Promise<boolean> {
    return this.쇼핑하러가기버튼.isDisplayed();
  }

  async 쇼핑하러가기누르기(): Promise<void> {
    await this.쇼핑하러가기버튼.click();
  }
}
