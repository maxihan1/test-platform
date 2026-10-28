import { type 앱, 금액, 켜졌나, 화면글들 } from '../helpers/app.helper.js';

export type 옵션 = '색상' | '사이즈';

const 옵션주소: Record<옵션, string> = { 색상: 'id=color_option', 사이즈: 'id=size_option' };

export class 상품상세화면 {
  static readonly 주소 = 'app:.MainActivity/product_description';

  constructor(private readonly driver: 앱) {}

  get 상품명() {
    return this.driver.$('id=product_name');
  }

  get 판매가() {
    return this.driver.$('id=product_price');
  }

  get 설명() {
    return this.driver.$('id=product_description');
  }

  get 수량빼기() {
    return this.driver.$('id=qty_minus');
  }

  get 수량() {
    return this.driver.$('id=qty_value');
  }

  get 수량더하기() {
    return this.driver.$('id=qty_plus');
  }

  get 총상품금액() {
    return this.driver.$('id=total_price');
  }

  get 담기버튼() {
    return this.driver.$('id=add_cart_button');
  }

  get 바로구매버튼() {
    return this.driver.$('id=buy_now_button');
  }

  get 품절버튼() {
    return this.driver.$('id=sold_out_button');
  }

  async 열릴때까지(timeout = 30000): Promise<void> {
    await this.설명.waitForDisplayed({ timeout });
  }

  async 보이나(): Promise<boolean> {
    return this.설명.isDisplayed();
  }

  async 상품명글(): Promise<string> {
    return this.상품명.getText();
  }

  async 판매가글(): Promise<string> {
    return this.판매가.getText();
  }

  async 판매가값(): Promise<number> {
    return 금액(await this.판매가글());
  }

  async 화면글들(): Promise<string[]> {
    return 화면글들(this.driver);
  }

  async 분류글(): Promise<string> {
    const 모음 = await this.화면글들();
    const 자리 = 모음.indexOf(await this.상품명글());
    return 자리 > 0 ? (모음[자리 - 1] ?? '') : '';
  }

  async 판매가앞글들(): Promise<string[]> {
    const 모음 = await this.화면글들();
    const 처음 = 모음.indexOf(await this.상품명글());
    const 끝 = 모음.indexOf(await this.판매가글());
    return 처음 >= 0 && 끝 > 처음 ? 모음.slice(처음 + 1, 끝) : [];
  }

  async 요약글(): Promise<string> {
    const 모음 = await this.화면글들();
    const 처음 = 모음.indexOf(await this.판매가글());
    const 끝 = 모음.indexOf(await this.설명.getText());
    return 처음 >= 0 && 끝 > 처음 + 1 ? 모음.slice(처음 + 1, 끝).join(' ') : '';
  }

  async 칩들(종류: 옵션) {
    return [...(await this.driver.$$(옵션주소[종류]))];
  }

  async 칩수(종류: 옵션): Promise<number> {
    return (await this.칩들(종류)).length;
  }

  async 옵션있나(): Promise<boolean> {
    return (await this.칩수('색상')) > 0 || (await this.칩수('사이즈')) > 0;
  }

  async 골라진칩수(): Promise<number> {
    let 수 = 0;
    for (const 칩 of [...(await this.칩들('색상')), ...(await this.칩들('사이즈'))]) if (await 켜졌나(칩)) 수 += 1;
    return 수;
  }

  async 칩누르기(종류: 옵션, 번째 = 0): Promise<void> {
    const 칩 = (await this.칩들(종류))[번째];
    if (칩 === undefined) throw new Error(`상품 상세에 ${종류} 칩이 ${String(번째 + 1)}개 없다`);
    await 칩.click();
  }

  async 칩골라졌나(종류: 옵션, 번째 = 0): Promise<boolean> {
    const 칩 = (await this.칩들(종류))[번째];
    return 칩 === undefined ? false : 켜졌나(칩);
  }

  async 옵션다고르기(): Promise<void> {
    if ((await this.칩수('색상')) > 0) await this.칩누르기('색상');
    if ((await this.칩수('사이즈')) > 0) await this.칩누르기('사이즈');
  }

  async 수량값(): Promise<number> {
    return Number(await this.수량.getText());
  }

  async 수량이될때까지(수: number, timeout = 10000): Promise<void> {
    await this.driver.waitUntil(async () => (await this.수량값()) === 수, { timeout, interval: 200 });
  }

  async 더하기(): Promise<void> {
    await this.수량더하기.click();
  }

  async 빼기(): Promise<void> {
    await this.수량빼기.click();
  }

  async 더하기눌리나(): Promise<boolean> {
    return this.수량더하기.isEnabled();
  }

  async 빼기눌리나(): Promise<boolean> {
    return this.수량빼기.isEnabled();
  }

  async 총상품금액글(): Promise<string> {
    return this.총상품금액.getText();
  }

  async 총상품금액값(): Promise<number> {
    return 금액(await this.총상품금액글());
  }

  async 담기(): Promise<void> {
    await this.담기버튼.click();
  }

  async 바로구매(): Promise<void> {
    await this.바로구매버튼.click();
  }

  async 담기보이나(): Promise<boolean> {
    return this.담기버튼.isDisplayed();
  }

  async 바로구매보이나(): Promise<boolean> {
    return this.바로구매버튼.isDisplayed();
  }

  async 품절버튼보이나(): Promise<boolean> {
    return this.품절버튼.isDisplayed();
  }

  async 품절버튼눌리나(): Promise<boolean> {
    return this.품절버튼.isEnabled();
  }

  async 품절버튼글(): Promise<string> {
    return this.품절버튼.$('android.widget.TextView').getText();
  }
}
