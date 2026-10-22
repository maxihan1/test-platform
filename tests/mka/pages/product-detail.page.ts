import { 기다림, 글들, 누름틀, 눌리는가, 밀어서찾기, 보이는가, 빠르게두번누르기, 화면글들, type 앱 } from '../helpers/app.helper.js';

export class 상품상세화면 {
  static readonly 주소 = 'app:.MainActivity/product_description';

  constructor(private readonly driver: 앱) {}

  get 상품명() {
    return this.driver.$('~product_name');
  }

  get 판매가() {
    return this.driver.$('~product_price');
  }

  get 설명() {
    return this.driver.$('~product_description');
  }

  get 수량() {
    return this.driver.$('~qty_value');
  }

  get 빼기() {
    return this.driver.$('~qty_minus');
  }

  get 더하기() {
    return this.driver.$('~qty_plus');
  }

  get 총금액() {
    return this.driver.$('~total_price');
  }

  get 담기버튼() {
    return this.driver.$('~add_cart_button');
  }

  get 바로구매버튼() {
    return this.driver.$('~buy_now_button');
  }

  get 품절버튼() {
    return this.driver.$('~sold_out_button');
  }

  색상칩들() {
    return this.driver.$$(누름틀('color_option'));
  }

  사이즈칩들() {
    return this.driver.$$(누름틀('size_option'));
  }

  async 열릴때까지(시간 = 기다림 * 2): Promise<boolean> {
    return this.설명.waitForDisplayed({ timeout: 시간 }).then(() => true, () => false);
  }

  async 보이는가(): Promise<boolean> {
    return this.설명.isDisplayed().catch(() => false);
  }

  async 화면글(): Promise<string[]> {
    return 화면글들(this.driver);
  }

  async 색상고르기(차례 = 0): Promise<void> {
    await (await this.색상칩들().getElements())[차례].click();
  }

  async 사이즈고르기(차례 = 0): Promise<void> {
    await (await this.사이즈칩들().getElements())[차례].click();
  }

  async 옵션고르기(): Promise<void> {
    if ((await this.색상칩들().getElements()).length > 0) await this.색상고르기(0);
    if ((await this.사이즈칩들().getElements()).length > 0) await this.사이즈고르기(0);
  }

  async 색상칩글들(): Promise<string[]> {
    return 글들(this.driver, `${누름틀('color_option')}//android.widget.TextView`);
  }

  async 사이즈칩글들(): Promise<string[]> {
    return 글들(this.driver, `${누름틀('size_option')}//android.widget.TextView`);
  }

  async 골라진색상수(): Promise<number> {
    return (await this.driver.$$(`${누름틀('color_option')}[@checked="true"]`).getElements()).length;
  }

  async 골라진사이즈수(): Promise<number> {
    return (await this.driver.$$(`${누름틀('size_option')}[@checked="true"]`).getElements()).length;
  }

  async 색상칩골라졌나(차례 = 0): Promise<boolean> {
    return (await (await this.색상칩들().getElements())[차례].getAttribute('checked')) === 'true';
  }

  async 사이즈칩골라졌나(차례 = 0): Promise<boolean> {
    return (await (await this.사이즈칩들().getElements())[차례].getAttribute('checked')) === 'true';
  }

  async 수량글(): Promise<string> {
    return this.수량.getText();
  }

  async 수량바뀔때까지(글: string, 시간 = 기다림): Promise<boolean> {
    return this.driver
      .waitUntil(async () => (await this.수량.getText().catch(() => '')) === 글, { timeout: 시간 })
      .then(() => true, () => false);
  }

  async 더하기누르기(): Promise<void> {
    await this.더하기.click();
  }

  async 빼기누르기(): Promise<void> {
    await this.빼기.click();
  }

  async 빼기눌리나(): Promise<boolean> {
    return 눌리는가(this.driver, 'qty_minus');
  }

  async 더하기눌리나(): Promise<boolean> {
    return 눌리는가(this.driver, 'qty_plus');
  }

  async 담기찾기(): Promise<boolean> {
    return 밀어서찾기(this.driver, '~add_cart_button');
  }

  async 담기누르기(): Promise<void> {
    await this.담기찾기();
    await this.담기버튼.click();
  }

  async 담기두번누르기(): Promise<void> {
    await this.담기찾기();
    await 빠르게두번누르기(this.driver, '~add_cart_button');
  }

  async 바로구매누르기(): Promise<void> {
    await 밀어서찾기(this.driver, '~buy_now_button');
    await this.바로구매버튼.click();
  }

  async 담기눌리나(): Promise<boolean> {
    return 눌리는가(this.driver, 'add_cart_button');
  }

  async 바로구매눌리나(): Promise<boolean> {
    return 눌리는가(this.driver, 'buy_now_button');
  }

  async 품절버튼눌리나(): Promise<boolean> {
    return 눌리는가(this.driver, 'sold_out_button');
  }

  async 담기보이나(): Promise<boolean> {
    return 보이는가(this.driver, '~add_cart_button');
  }

  async 바로구매보이나(): Promise<boolean> {
    return 보이는가(this.driver, '~buy_now_button');
  }

  async 색상칩찾기(): Promise<boolean> {
    return 밀어서찾기(this.driver, 누름틀('color_option'));
  }

  async 사이즈칩찾기(): Promise<boolean> {
    return 밀어서찾기(this.driver, 누름틀('size_option'));
  }

  async 색상찾아고르기(차례 = 0): Promise<void> {
    if (await this.색상칩찾기()) await this.색상고르기(차례);
  }

  async 사이즈찾아고르기(차례 = 0): Promise<void> {
    if (await this.사이즈칩찾기()) await this.사이즈고르기(차례);
  }

  async 옵션찾아고르기(): Promise<void> {
    await this.색상찾아고르기();
    await this.사이즈찾아고르기();
  }

  async 색상칩골라질때까지(차례 = 0, 시간 = 기다림): Promise<boolean> {
    return this.driver
      .waitUntil(async () => this.색상칩골라졌나(차례).catch(() => false), { timeout: 시간 })
      .then(() => true, () => false);
  }

  async 사이즈칩골라질때까지(차례 = 0, 시간 = 기다림): Promise<boolean> {
    return this.driver
      .waitUntil(async () => this.사이즈칩골라졌나(차례).catch(() => false), { timeout: 시간 })
      .then(() => true, () => false);
  }

  async 수량찾기(): Promise<boolean> {
    if (await 밀어서찾기(this.driver, '~qty_plus')) return true;
    return 밀어서찾기(this.driver, '~qty_plus', 'up');
  }

  async 바로구매찾기(): Promise<boolean> {
    return 밀어서찾기(this.driver, '~buy_now_button');
  }

  async 품절버튼글(): Promise<string> {
    return this.driver.$(`${누름틀('sold_out_button')}//android.widget.TextView`).getText().catch(() => '');
  }

  async 총금액글(): Promise<string> {
    return this.총금액.getText().catch(() => '');
  }

  async 총금액바뀔때까지(글: string, 시간 = 기다림): Promise<boolean> {
    return this.driver
      .waitUntil(async () => (await this.총금액.getText().catch(() => '')) === 글, { timeout: 시간 })
      .then(() => true, () => false);
  }

  async 글이판매가앞인가(글: string): Promise<boolean> {
    const 앞 = this.driver.$(`//android.widget.TextView[@text="${글}"]`);
    const 앞자리 = await 앞.getLocation().catch(() => undefined);
    const 앞크기 = await 앞.getSize().catch(() => undefined);
    const 판매가자리 = await this.판매가.getLocation().catch(() => undefined);
    if (앞자리 === undefined || 앞크기 === undefined || 판매가자리 === undefined) return false;
    if (앞자리.y + 앞크기.height <= 판매가자리.y) return true;
    return Math.abs(앞자리.y - 판매가자리.y) < 앞크기.height && 앞자리.x < 판매가자리.x;
  }
}
