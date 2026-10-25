import { type 앱, 금액, 화면글들 } from '../helpers/app.helper.js';

export type 취소사유 = '단순 변심' | '상품 정보 상이' | '배송 지연' | '기타';

export const 취소사유들: 취소사유[] = ['단순 변심', '상품 정보 상이', '배송 지연', '기타'];

export class 주문상세화면 {
  static readonly 주소 = 'app:.MainActivity/cancel_order_button';

  constructor(private readonly driver: 앱) {}

  get 주문번호() {
    return this.driver.$('id=order_id');
  }

  get 상태() {
    return this.driver.$('id=order_status');
  }

  get 결제수단() {
    return this.driver.$('id=order_payment');
  }

  get 결제금액() {
    return this.driver.$('id=order_total');
  }

  get 주문취소버튼() {
    return this.driver.$('id=cancel_order_button');
  }

  get 취소사유줄() {
    return this.driver.$('id=cancel_reason');
  }

  get 사유글칸() {
    return this.driver.$('id=cancel_detail');
  }

  get 창닫기버튼() {
    return this.driver.$('id=dialog_cancel');
  }

  get 취소하기버튼() {
    return this.driver.$('id=dialog_confirm');
  }

  사유칸(사유: 취소사유) {
    return this.driver.$(`id=cancel_reason_${String(취소사유들.indexOf(사유))}`);
  }

  async 열릴때까지(timeout = 30000): Promise<void> {
    await this.결제수단.waitForDisplayed({ timeout });
  }

  async 보이나(): Promise<boolean> {
    return this.결제수단.isDisplayed();
  }

  async 화면글들(): Promise<string[]> {
    return 화면글들(this.driver);
  }

  async 주문번호글(): Promise<string> {
    return this.주문번호.getText();
  }

  async 상태글(): Promise<string> {
    return this.상태.getText();
  }

  async 상태가될때까지(글: string, timeout = 15000): Promise<void> {
    await this.driver.waitUntil(async () => (await this.상태.getText()) === 글, { timeout, interval: 300 });
  }

  async 상품줄글들(): Promise<string[]> {
    const 모음: string[] = [];
    for (const 줄 of await this.driver.$$('id=order_line')) 모음.push(await 줄.getText());
    return 모음;
  }

  async 결제수단글(): Promise<string> {
    return this.결제수단.getText();
  }

  async 결제금액값(): Promise<number> {
    return 금액(await this.결제금액.getText());
  }

  async 주문취소보이나(): Promise<boolean> {
    return this.주문취소버튼.isDisplayed();
  }

  async 취소사유줄보이나(): Promise<boolean> {
    return this.취소사유줄.isDisplayed();
  }

  async 취소사유줄뜰때까지(timeout = 15000): Promise<void> {
    await this.취소사유줄.waitForDisplayed({ timeout });
  }

  async 취소사유줄글(): Promise<string> {
    return this.취소사유줄.getText();
  }

  async 취소창열기(): Promise<void> {
    await this.주문취소버튼.click();
    await this.사유칸('단순 변심').waitForDisplayed({ timeout: 10000 });
  }

  async 취소창보이나(): Promise<boolean> {
    return this.사유칸('단순 변심').isDisplayed();
  }

  async 취소창닫힐때까지(timeout = 15000): Promise<void> {
    await this.사유칸('단순 변심').waitForDisplayed({ timeout, reverse: true });
  }

  async 사유이름(사유: 취소사유): Promise<string> {
    return this.사유칸(사유).$('android.widget.TextView').getText();
  }

  async 창버튼이름들(): Promise<string[]> {
    return [
      await this.취소하기버튼.$('android.widget.TextView').getText(),
      await this.창닫기버튼.$('android.widget.TextView').getText(),
    ];
  }

  async 사유고르기(사유: 취소사유): Promise<void> {
    await this.사유칸(사유).click();
  }

  async 사유글칸보이나(): Promise<boolean> {
    return this.사유글칸.isDisplayed();
  }

  async 사유글적기(값: string): Promise<void> {
    await this.사유글칸.waitForDisplayed({ timeout: 10000 });
    await this.사유글칸.click();
    await this.사유글칸.clearValue();
    if (값 !== '') await this.사유글칸.setValue(값);
    await this.driver.hideKeyboard().catch(() => undefined);
  }

  async 취소하기누르기(): Promise<void> {
    await this.취소하기버튼.click();
  }

  async 취소하기두번누르기(): Promise<void> {
    const 버튼 = await this.취소하기버튼.getElement();
    await Promise.all([버튼.click(), 버튼.click()]);
  }

  async 창닫기(): Promise<void> {
    await this.창닫기버튼.click();
  }
}
