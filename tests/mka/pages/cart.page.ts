import { 기다림, 글들, 누름틀, 눌리는가, 켜졌나, 화면글들, type 앱 } from '../helpers/app.helper.js';

function 금액만(글: string): string {
  return 글.replace(/^[^0-9]*/, '').trim();
}

export class 장바구니화면 {
  static readonly 주소 = 'app:.MainActivity/cart_list';

  constructor(private readonly driver: 앱) {}

  get 전체선택() {
    return this.driver.$('~select_all');
  }

  get 전체선택글() {
    return this.driver.$('//android.widget.CheckBox[@resource-id="select_all"]/following-sibling::android.widget.TextView[1]');
  }

  get 선택삭제() {
    return this.driver.$('~delete_selected');
  }

  get 상품금액() {
    return this.driver.$('~goods_amount');
  }

  get 배송비() {
    return this.driver.$('~shipping_fee');
  }

  get 무료배송안내() {
    return this.driver.$('~free_shipping_hint');
  }

  get 결제예정금액() {
    return this.driver.$('~pay_amount');
  }

  get 주문하기() {
    return this.driver.$('~order_button');
  }

  get 비어있음() {
    return this.driver.$('~cart_empty');
  }

  get 쇼핑하러가기() {
    return this.driver.$('~go_shopping_button');
  }

  줄선택자(상품명: string): string {
    return `//android.view.View[@resource-id="cart_item"][.//android.widget.TextView[@resource-id="cart_item_name" and @text="${상품명}"]]`;
  }

  줄체크(상품명: string) {
    return this.driver.$(`${this.줄선택자(상품명)}//android.widget.CheckBox[@resource-id="cart_check"]`);
  }

  줄수량(상품명: string) {
    return this.driver.$(`${this.줄선택자(상품명)}//android.widget.TextView[@resource-id="cart_qty_value"]`);
  }

  줄금액(상품명: string) {
    return this.driver.$(`${this.줄선택자(상품명)}//android.widget.TextView[@resource-id="cart_item_price"]`);
  }

  줄빼기(상품명: string) {
    return this.driver.$(`${this.줄선택자(상품명)}//android.view.View[@resource-id="cart_qty_minus"]`);
  }

  줄더하기(상품명: string) {
    return this.driver.$(`${this.줄선택자(상품명)}//android.view.View[@resource-id="cart_qty_plus"]`);
  }

  async 열릴때까지(시간 = 기다림 * 2): Promise<boolean> {
    return this.driver
      .waitUntil(
        async () =>
          (await this.driver.$('~cart_item').isDisplayed().catch(() => false)) ||
          (await this.비어있음.isDisplayed().catch(() => false)),
        { timeout: 시간 },
      )
      .then(() => true, () => false);
  }

  async 보이는가(): Promise<boolean> {
    if (await this.선택삭제.isDisplayed().catch(() => false)) return true;
    return this.비어있음.isDisplayed().catch(() => false);
  }

  async 줄이름들(): Promise<string[]> {
    return 글들(this.driver, '~cart_item_name');
  }

  async 줄글들(상품명: string): Promise<string[]> {
    return 글들(this.driver, `${this.줄선택자(상품명)}//android.widget.TextView`);
  }

  async 줄수(): Promise<number> {
    return (await this.driver.$$('~cart_item').getElements()).length;
  }

  async 줄체크켜졌나(상품명: string): Promise<boolean> {
    return (await this.줄체크(상품명).getAttribute('checked')) === 'true';
  }

  async 켜진줄체크수(): Promise<number> {
    return (await this.driver.$$('//android.widget.CheckBox[@resource-id="cart_check" and @checked="true"]').getElements()).length;
  }

  async 줄체크수(): Promise<number> {
    return (await this.driver.$$('~cart_check').getElements()).length;
  }

  async 전체선택켜졌나(): Promise<boolean> {
    return 켜졌나(this.driver, '~select_all');
  }

  async 줄빼기눌리나(상품명: string): Promise<boolean> {
    return (await this.줄빼기(상품명).getAttribute('enabled')) === 'true';
  }

  async 줄더하기눌리나(상품명: string): Promise<boolean> {
    return (await this.줄더하기(상품명).getAttribute('enabled')) === 'true';
  }

  async 줄수량바뀔때까지(상품명: string, 글: string, 시간 = 기다림): Promise<boolean> {
    return this.driver
      .waitUntil(async () => (await this.줄수량(상품명).getText().catch(() => '')) === 글, { timeout: 시간 })
      .then(() => true, () => false);
  }

  async 글바뀔때까지(선택자: string, 글: string, 시간 = 기다림): Promise<boolean> {
    return this.driver
      .waitUntil(async () => (await this.driver.$(선택자).getText().catch(() => '')) === 글, { timeout: 시간 })
      .then(() => true, () => false);
  }

  async 주문하기눌리나(): Promise<boolean> {
    return 눌리는가(this.driver, 'order_button');
  }

  async 줄빼기있나(): Promise<boolean> {
    return (await this.driver.$$(누름틀('cart_qty_minus')).getElements()).length > 0;
  }

  줄이름(상품명: string) {
    return this.driver.$(`${this.줄선택자(상품명)}//android.widget.TextView[@resource-id="cart_item_name"]`);
  }

  async 줄옵션글(상품명: string): Promise<string> {
    return (await this.줄글들(상품명)).find((글) => 글.includes(' / ')) ?? '';
  }

  async 줄에빠진요소(상품명: string): Promise<string> {
    const 요소들 = [
      ['체크박스', this.줄체크(상품명)],
      ['상품명', this.줄이름(상품명)],
      ['줄 금액', this.줄금액(상품명)],
      ['「−」', this.줄빼기(상품명)],
      ['수량', this.줄수량(상품명)],
      ['「+」', this.줄더하기(상품명)],
    ] as const;
    const 빠짐: string[] = [];
    for (const [이름, 요소] of 요소들) {
      if (!(await 요소.isDisplayed().catch(() => false))) 빠짐.push(이름);
    }
    return 빠짐.join(', ');
  }

  async 글이보이나(글: string): Promise<boolean> {
    return (await 화면글들(this.driver)).some((본문) => 본문.includes(글));
  }

  async 줄금액글(상품명: string): Promise<string> {
    return 금액만(await this.줄금액(상품명).getText().catch(() => ''));
  }

  async 상품금액글(): Promise<string> {
    return 금액만(await this.상품금액.getText().catch(() => ''));
  }

  async 배송비글(): Promise<string> {
    return 금액만(await this.배송비.getText().catch(() => ''));
  }

  async 무료배송안내글(): Promise<string> {
    return (await this.무료배송안내.getText().catch(() => '')).trim();
  }

  async 줄금액바뀔때까지(상품명: string, 글: string, 시간 = 기다림): Promise<boolean> {
    return this.driver
      .waitUntil(async () => (await this.줄금액글(상품명)) === 글, { timeout: 시간 })
      .then(() => true, () => false);
  }

  async 상품금액바뀔때까지(글: string, 시간 = 기다림): Promise<boolean> {
    return this.driver
      .waitUntil(async () => (await this.상품금액글()) === 글, { timeout: 시간 })
      .then(() => true, () => false);
  }

  async 배송비바뀔때까지(글: string, 시간 = 기다림): Promise<boolean> {
    return this.driver
      .waitUntil(async () => (await this.배송비글()) === 글, { timeout: 시간 })
      .then(() => true, () => false);
  }

  async 켜진줄체크수바뀔때까지(수: number, 시간 = 기다림): Promise<boolean> {
    return this.driver
      .waitUntil(async () => (await this.켜진줄체크수()) === 수, { timeout: 시간 })
      .then(() => true, () => false);
  }

  async 줄수바뀔때까지(수: number, 시간 = 기다림): Promise<boolean> {
    return this.driver
      .waitUntil(async () => (await this.줄수()) === 수, { timeout: 시간 })
      .then(() => true, () => false);
  }

  async 전체선택바뀔때까지(켜짐: boolean, 시간 = 기다림): Promise<boolean> {
    return this.driver
      .waitUntil(async () => (await this.전체선택켜졌나()) === 켜짐, { timeout: 시간 })
      .then(() => true, () => false);
  }

  async 쇼핑하러가기보이나(): Promise<boolean> {
    return this.쇼핑하러가기.isDisplayed().catch(() => false);
  }
}
