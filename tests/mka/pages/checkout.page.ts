import { 가로로끝까지, 기기날짜, 기다림, 글들, 누름틀, 눌리는가, 맨위로, 밀어서찾기, 빠르게두번누르기, 입력칸, 칩날짜, 켜졌나, 화면글들, type 앱 } from '../helpers/app.helper.js';

const 결제수단이름: Record<string, string> = { 신용카드: 'pay_card', 계좌이체: 'pay_bank', 무통장입금: 'pay_deposit' };

export interface 배송정보 {
  받는분: string;
  연락처: string;
  상세주소: string;
}

export class 주문하기화면 {
  static readonly 주소 = 'app:.MainActivity/receiver';

  constructor(private readonly driver: 앱) {}

  get 받는분칸() {
    return this.driver.$(입력칸('receiver'));
  }

  get 연락처칸() {
    return this.driver.$(입력칸('phone'));
  }

  get 상세주소칸() {
    return this.driver.$(입력칸('address_detail'));
  }

  get 받는분칸이름() {
    return this.driver.$(`${입력칸('receiver')}/android.widget.TextView`);
  }

  get 연락처칸이름() {
    return this.driver.$(`${입력칸('phone')}/android.widget.TextView`);
  }

  get 상세주소칸이름() {
    return this.driver.$(`${입력칸('address_detail')}/android.widget.TextView`);
  }

  get 주소값() {
    return this.driver.$('~address_value');
  }

  get 주소검색버튼() {
    return this.driver.$('~address_search_button');
  }

  get 주소검색버튼글() {
    return this.driver.$(`${누름틀('address_search_button')}//android.widget.TextView`);
  }

  get 날짜틀() {
    return this.driver.$('//android.widget.HorizontalScrollView');
  }

  get 쿠폰없음() {
    return this.driver.$('~coupon_none');
  }

  get 상품금액() {
    return this.driver.$('~goods_amount');
  }

  get 쿠폰할인() {
    return this.driver.$('~discount_amount');
  }

  get 배송비() {
    return this.driver.$('~shipping_fee');
  }

  get 최종금액() {
    return this.driver.$('~total_amount');
  }

  get 동의() {
    return this.driver.$('~agree_check');
  }

  get 결제버튼() {
    return this.driver.$('~pay_button');
  }

  get 결제버튼글() {
    return this.driver.$(`${누름틀('pay_button')}//android.widget.TextView`);
  }

  get 검색어칸() {
    return this.driver.$(입력칸('address_keyword'));
  }

  get 검색버튼() {
    return this.driver.$('~address_find');
  }

  get 검색결과() {
    return this.driver.$('~address_result');
  }

  get 검색결과없음() {
    return this.driver.$('~address_empty');
  }

  get 창닫기() {
    return this.driver.$('~dialog_cancel');
  }

  결제수단(이름: string) {
    return this.driver.$(`~${결제수단이름[이름]}`);
  }

  결제수단글(이름: string) {
    return this.driver.$(`${누름틀(결제수단이름[이름])}//android.widget.TextView`);
  }

  쿠폰(번호: string) {
    return this.driver.$(`~coupon_${번호}`);
  }

  쿠폰글(번호: string) {
    return this.driver.$(`${누름틀(`coupon_${번호}`)}//android.widget.TextView`);
  }

  날짜칩들() {
    return this.driver.$$(누름틀('delivery_date'));
  }

  async 열릴때까지(시간 = 기다림 * 2): Promise<boolean> {
    return this.driver.$('~checkout_line').waitForDisplayed({ timeout: 시간 }).then(() => true, () => false);
  }

  async 보이는가(): Promise<boolean> {
    return this.driver.$('~checkout_line').isDisplayed().catch(() => false);
  }

  async 주문상품줄들(): Promise<string[]> {
    return 글들(this.driver, '~checkout_line');
  }

  async 화면글(): Promise<string[]> {
    return 화면글들(this.driver);
  }

  async 찾기(선택자: string): Promise<boolean> {
    if (await 밀어서찾기(this.driver, 선택자, 'down', 4)) return true;
    return 밀어서찾기(this.driver, 선택자, 'up', 6);
  }

  async 맨위로가기(): Promise<void> {
    await 맨위로(this.driver);
  }

  async 칸적기(칸: 'receiver' | 'phone' | 'address_detail', 글: string): Promise<void> {
    await this.찾기(입력칸(칸));
    const 요소 = this.driver.$(입력칸(칸));
    if (글 === '') await 요소.clearValue();
    else await 요소.setValue(글);
    if (await this.driver.isKeyboardShown().catch(() => false)) await this.driver.hideKeyboard().catch(() => undefined);
  }

  async 칸글(칸: 'receiver' | 'phone' | 'address_detail'): Promise<string> {
    await this.찾기(입력칸(칸));
    return this.driver.$(입력칸(칸)).getText();
  }

  async 배송정보적기(정보: 배송정보): Promise<void> {
    await this.칸적기('receiver', 정보.받는분);
    await this.칸적기('phone', 정보.연락처);
    await this.칸적기('address_detail', 정보.상세주소);
  }

  async 주소검색열기(): Promise<void> {
    await this.찾기('~address_search_button');
    await this.주소검색버튼.click();
    await this.검색버튼.waitForDisplayed({ timeout: 기다림 });
  }

  async 주소검색하기(검색어: string): Promise<void> {
    await this.검색어칸.setValue(검색어);
    await this.검색버튼.click();
  }

  async 결과나올때까지(시간 = 기다림): Promise<boolean> {
    return this.driver
      .waitUntil(
        async () =>
          (await this.검색결과.isDisplayed().catch(() => false)) || (await this.검색결과없음.isDisplayed().catch(() => false)),
        { timeout: 시간 },
      )
      .then(() => true, () => false);
  }

  async 주소고르기(검색어: string): Promise<void> {
    await this.주소검색열기();
    await this.주소검색하기(검색어);
    await this.검색결과.waitForDisplayed({ timeout: 기다림 });
    await this.검색결과.click();
    await this.검색버튼.waitForDisplayed({ timeout: 기다림, reverse: true });
  }

  async 날짜칩글들(): Promise<string[]> {
    await this.찾기('//android.widget.HorizontalScrollView');
    return 글들(this.driver, `${누름틀('delivery_date')}//android.widget.TextView`);
  }

  async 날짜칩끝까지밀기(): Promise<void> {
    await this.찾기('//android.widget.HorizontalScrollView');
    await 가로로끝까지(this.driver, '//android.widget.HorizontalScrollView');
  }

  날짜칩선택자(날짜글: string): string {
    return `//android.view.View[@resource-id="delivery_date"][.//android.widget.TextView[@text="${날짜글}"]]`;
  }

  async 날짜고르기(날짜글?: string): Promise<void> {
    await this.찾기('//android.widget.HorizontalScrollView');
    if (날짜글 === undefined) {
      const 첫날 = await 기기날짜(this.driver, 2);
      await this.날짜고르기(칩날짜(await 기기날짜(this.driver, 첫날.getUTCDay() === 0 ? 3 : 2)));
      return;
    }
    for (let i = 0; i < 6; i += 1) {
      if (await this.driver.$(this.날짜칩선택자(날짜글)).isDisplayed().catch(() => false)) break;
      await this.driver.execute('mobile: scrollGesture', { elementId: (await this.날짜틀).elementId, direction: 'right', percent: 0.5 });
    }
    await this.driver.$(this.날짜칩선택자(날짜글)).click();
  }

  async 날짜칩골라졌나(차례 = 0): Promise<boolean> {
    return (await (await this.날짜칩들().getElements())[차례].getAttribute('checked')) === 'true';
  }

  async 결제수단고르기(이름: string): Promise<void> {
    await this.찾기(`~${결제수단이름[이름]}`);
    await this.결제수단(이름).click();
  }

  async 쿠폰고르기(번호: string): Promise<void> {
    await this.찾기(`~coupon_${번호}`);
    await this.쿠폰(번호).click();
  }

  async 쿠폰눌리나(번호: string): Promise<boolean> {
    await this.찾기(`~coupon_${번호}`);
    return 눌리는가(this.driver, `coupon_${번호}`);
  }

  async 금액글(선택자: '~goods_amount' | '~discount_amount' | '~shipping_fee' | '~total_amount'): Promise<string> {
    await this.찾기(선택자);
    return this.driver.$(선택자).getText();
  }

  async 금액바뀔때까지(선택자: string, 앞글: string, 시간 = 기다림): Promise<boolean> {
    return this.driver
      .waitUntil(async () => {
        const 지금 = await this.driver.$(선택자).getText().catch(() => 앞글);
        return 지금 !== 앞글;
      }, { timeout: 시간 })
      .then(() => true, () => false);
  }

  async 동의누르기(): Promise<void> {
    await this.찾기('~agree_check');
    await this.동의.click();
  }

  async 동의켜졌나(): Promise<boolean> {
    return 켜졌나(this.driver, '~agree_check');
  }

  async 결제눌리나(): Promise<boolean> {
    await this.찾기('~pay_button');
    return 눌리는가(this.driver, 'pay_button');
  }

  async 결제누르기(): Promise<void> {
    await this.찾기('~pay_button');
    await this.결제버튼.click();
  }

  async 결제두번누르기(): Promise<void> {
    await this.찾기('~pay_button');
    await 빠르게두번누르기(this.driver, '~pay_button');
  }

  async 다채우기(정보: 배송정보, 검색어: string, 결제수단: string): Promise<void> {
    await this.배송정보적기(정보);
    await this.주소고르기(검색어);
    await this.날짜고르기();
    await this.결제수단고르기(결제수단);
  }

  async 칸이름읽기(칸: 'receiver' | 'phone' | 'address_detail'): Promise<string> {
    await this.찾기(입력칸(칸));
    const 이름 = 칸 === 'receiver' ? this.받는분칸이름 : 칸 === 'phone' ? this.연락처칸이름 : this.상세주소칸이름;
    return 이름.getText().catch(() => '');
  }

  async 주소글(): Promise<string> {
    await this.찾기('~address_value');
    return this.주소값.getText().catch(() => '');
  }

  async 주소검색버튼글읽기(): Promise<string> {
    await this.찾기('~address_search_button');
    return this.주소검색버튼글.getText().catch(() => '');
  }

  async 결제수단글읽기(이름: string): Promise<string> {
    await this.찾기(`~${결제수단이름[이름]}`);
    return this.결제수단글(이름).getText().catch(() => '');
  }

  async 쿠폰글읽기(번호: string): Promise<string> {
    await this.찾기(`~coupon_${번호}`);
    return this.쿠폰글(번호).getText().catch(() => '');
  }

  async 금액줄차례(): Promise<string> {
    const 이름들 = ['상품 금액', '쿠폰 할인', '배송비', '최종 결제 금액'];
    await this.찾기('~goods_amount');
    await 밀어서찾기(this.driver, '~total_amount', 'down', 3);
    const 글 = await 화면글들(this.driver);
    return 글.flatMap((줄) => 이름들.filter((이름) => 줄.startsWith(이름))).join(' · ');
  }

  async 주소검색창열기(): Promise<boolean> {
    await this.찾기('~address_search_button');
    await this.주소검색버튼.click();
    return this.검색버튼.waitForDisplayed({ timeout: 기다림 }).then(() => true, () => false);
  }

  async 주소검색창닫기(): Promise<boolean> {
    await this.창닫기.click();
    return this.검색버튼.waitForDisplayed({ timeout: 기다림, reverse: true }).then(() => true, () => false);
  }

  async 주소검색창닫혔나(): Promise<boolean> {
    return this.검색버튼.waitForDisplayed({ timeout: 기다림, reverse: true }).then(() => true, () => false);
  }

  async 결과줄뜰때까지(시간 = 기다림): Promise<boolean> {
    return this.검색결과.waitForDisplayed({ timeout: 시간 }).then(() => true, () => false);
  }

  async 결과줄글(): Promise<string> {
    return this.검색결과.getText().catch(() => '');
  }

  async 결과줄누르기(): Promise<void> {
    await this.검색결과.click();
  }

  async 결과없음글(): Promise<string> {
    return this.검색결과없음.getText().catch(() => '');
  }

  async 결과없음보이나(): Promise<boolean> {
    return this.검색결과없음.isDisplayed().catch(() => false);
  }

  async 첫날짜칩누르기(): Promise<void> {
    await this.찾기('//android.widget.HorizontalScrollView');
    await (await this.날짜칩들().getElements())[0].click();
  }
}
