import { 기다림, 글들, 밀어서찾기, 보이는가, 빠르게두번누르기, 입력칸, 한번밀기, 화면글들, type 앱 } from '../helpers/app.helper.js';

export class 주문상세화면 {
  static readonly 주소 = 'app:.MainActivity/order_line';

  constructor(private readonly driver: 앱) {}

  get 주문번호() {
    return this.driver.$('~order_id');
  }

  get 상태() {
    return this.driver.$('~order_status');
  }

  get 결제수단() {
    return this.driver.$('~order_payment');
  }

  get 결제금액() {
    return this.driver.$('~order_total');
  }

  get 주문취소버튼() {
    return this.driver.$('~cancel_order_button');
  }

  get 취소사유칸() {
    return this.driver.$(입력칸('cancel_detail'));
  }

  get 취소하기() {
    return this.driver.$('~dialog_confirm');
  }

  get 창닫기() {
    return this.driver.$('~dialog_cancel');
  }

  사유(차례: number) {
    return this.driver.$(`~cancel_reason_${차례}`);
  }

  async 열릴때까지(시간 = 기다림 * 2): Promise<boolean> {
    return this.driver.$('~order_line').waitForDisplayed({ timeout: 시간 }).then(() => true, () => false);
  }

  async 보이는가(): Promise<boolean> {
    return this.driver.$('~order_line').isDisplayed().catch(() => false);
  }

  async 상품줄들(): Promise<string[]> {
    return 글들(this.driver, '~order_line');
  }

  async 화면글(): Promise<string[]> {
    return 화면글들(this.driver);
  }

  async 상태바뀔때까지(글: string, 시간 = 기다림): Promise<boolean> {
    return this.driver
      .waitUntil(async () => (await this.상태.getText().catch(() => '')) === 글, { timeout: 시간 })
      .then(() => true, () => false);
  }

  async 주문취소보이나(): Promise<boolean> {
    if (await 밀어서찾기(this.driver, '~cancel_order_button', 'down', 3)) return true;
    return 보이는가(this.driver, '~cancel_order_button');
  }

  async 취소창열기(): Promise<void> {
    await 밀어서찾기(this.driver, '~cancel_order_button', 'down', 3);
    await this.주문취소버튼.click();
    await this.취소하기.waitForDisplayed({ timeout: 기다림 });
  }

  async 사유이름들(): Promise<string[]> {
    const 모음: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      모음.push(...(await 글들(this.driver, `//android.view.View[@resource-id="cancel_reason_${i}"]//android.widget.TextView`)));
    }
    return 모음;
  }

  async 창글들(): Promise<string[]> {
    return 화면글들(this.driver);
  }

  async 끝까지읽기(최대 = 8): Promise<string[]> {
    const 모음: string[] = [];
    let 그대로 = 0;
    for (let i = 0; i < 최대 && 그대로 < 2; i += 1) {
      const 앞 = 모음.length;
      for (const 글 of await 화면글들(this.driver)) if (!모음.includes(글)) 모음.push(글);
      그대로 = 모음.length === 앞 ? 그대로 + 1 : 0;
      await 한번밀기(this.driver);
    }
    return 모음;
  }

  async 취소사유칸보일때까지(시간 = 기다림): Promise<boolean> {
    return this.취소사유칸.waitForDisplayed({ timeout: 시간 }).then(() => true, () => false);
  }

  async 사유고르기(차례: number): Promise<void> {
    await this.사유(차례).click();
  }

  async 취소사유적기(글: string): Promise<void> {
    await this.취소사유칸.waitForDisplayed({ timeout: 기다림 });
    await this.취소사유칸.setValue(글);
  }

  async 취소하기누르기(): Promise<void> {
    await this.취소하기.click();
  }

  async 취소하기두번누르기(): Promise<void> {
    await 빠르게두번누르기(this.driver, '~dialog_confirm');
  }

  async 창보이나(): Promise<boolean> {
    return 보이는가(this.driver, '~dialog_confirm');
  }

  async 창닫힐때까지(시간 = 기다림): Promise<boolean> {
    return this.취소하기.waitForDisplayed({ timeout: 시간, reverse: true }).then(() => true, () => false);
  }
}
