import { type 앱, type 요소, 금액, 월일글, 일요일아닌첫날, 켜졌나, 칸에적기 } from '../helpers/app.helper.js';
import { 주소검색창 } from './address-search.page.js';

export type 결제수단 = '신용카드' | '계좌이체' | '무통장입금';
export type 주문칸 = '받는 분' | '연락처' | '주소' | '상세 주소' | '배송 희망일' | '결제 수단';

const 결제수단주소: Record<결제수단, string> = {
  신용카드: 'id=pay_card',
  계좌이체: 'id=pay_bank',
  무통장입금: 'id=pay_deposit',
};

const 쿠폰들주소 = '//*[starts-with(@resource-id, "coupon_") and @resource-id != "coupon_none" and @clickable = "true"]';

export interface 주문서값 {
  받는분: string;
  연락처: string;
  검색어: string;
  상세주소: string;
  결제수단: 결제수단;
}

export class 주문하기화면 {
  static readonly 주소 = 'app:.MainActivity/receiver';

  constructor(private readonly driver: 앱) {}

  get 스크롤() { return this.driver.$('android.widget.ScrollView'); }
  get 받는분() { return this.driver.$('id=receiver'); }
  get 연락처() { return this.driver.$('id=phone'); }
  get 주소줄() { return this.driver.$('id=address_value'); }
  get 주소검색버튼() { return this.driver.$('id=address_search_button'); }
  get 상세주소() { return this.driver.$('id=address_detail'); }
  get 날짜줄() { return this.driver.$('android.widget.HorizontalScrollView'); }
  get 사용안함() { return this.driver.$('id=coupon_none'); }
  get 상품금액() { return this.driver.$('id=goods_amount'); }
  get 쿠폰할인() { return this.driver.$('id=discount_amount'); }
  get 배송비() { return this.driver.$('id=shipping_fee'); }
  get 최종결제금액() { return this.driver.$('id=total_amount'); }
  get 동의() { return this.driver.$('id=agree_check'); }
  get 결제버튼() { return this.driver.$('id=pay_button'); }
  결제수단칸(이름: 결제수단) {
    return this.driver.$(결제수단주소[이름]);
  }

  async 열릴때까지(timeout = 30000): Promise<void> {
    await this.받는분.waitForDisplayed({ timeout });
  }

  async 보이나(): Promise<boolean> {
    return this.driver.$('id=checkout_line').isExisting();
  }

  async 주문상품줄글들(): Promise<string[]> {
    const 모음: string[] = [];
    for (const 줄 of await this.driver.$$('id=checkout_line')) 모음.push(await 줄.getText());
    return 모음;
  }

  async 아래로밀기(): Promise<void> {
    await this.driver.hideKeyboard().catch(() => undefined);
    await this.driver.swipe({ direction: 'up', scrollableElement: await this.스크롤.getElement(), percent: 0.7 });
  }

  async 위로밀기(): Promise<void> {
    await this.driver.hideKeyboard().catch(() => undefined);
    await this.driver.swipe({ direction: 'down', scrollableElement: await this.스크롤.getElement(), percent: 0.9 });
  }

  async 보일때까지밀기(칸: 요소, 아래로 = true): Promise<void> {
    for (let 번 = 0; 번 < 6 && !(await 칸.isDisplayed()); 번 += 1) {
      if (아래로) await this.아래로밀기();
      else await this.위로밀기();
    }
  }

  async 칸이름(칸: 요소): Promise<string> {
    return 칸.$('android.widget.TextView').getText();
  }

  async 받는분적기(값: string): Promise<void> {
    await this.보일때까지밀기(await this.받는분.getElement(), false);
    await 칸에적기(this.driver, await this.받는분.getElement(), 값);
  }

  async 연락처적기(값: string): Promise<void> {
    await this.보일때까지밀기(await this.연락처.getElement(), false);
    await 칸에적기(this.driver, await this.연락처.getElement(), 값);
  }

  async 연락처글(): Promise<string> {
    return this.연락처.getText();
  }

  async 상세주소적기(값: string): Promise<void> {
    await this.보일때까지밀기(await this.상세주소.getElement(), false);
    await 칸에적기(this.driver, await this.상세주소.getElement(), 값);
  }

  async 주소줄글(): Promise<string> {
    await this.보일때까지밀기(await this.주소줄.getElement(), false);
    return this.주소줄.getText();
  }

  async 주소검색열기(): Promise<void> {
    await this.보일때까지밀기(await this.주소검색버튼.getElement(), false);
    await this.주소검색버튼.click();
    await new 주소검색창(this.driver).열릴때까지();
  }

  async 주소넣기(검색어: string): Promise<string> {
    await this.주소검색열기();
    const 창 = new 주소검색창(this.driver);
    await 창.주소찾기(검색어);
    await 창.결과나올때까지();
    return 창.첫결과고르기();
  }

  async 보이는날짜칩들(): Promise<요소[]> {
    return [...(await this.driver.$$('id=delivery_date'))];
  }

  async 날짜칩글(칩: 요소): Promise<string> {
    return 칩.$('android.widget.TextView').getText();
  }

  async 날짜칩골라졌나(칩: 요소): Promise<boolean> {
    return 켜졌나(칩);
  }

  async 날짜줄보이게(): Promise<void> {
    await this.보일때까지밀기(await this.날짜줄.getElement());
  }

  async 날짜칩글모두(최대밀기 = 8): Promise<string[]> {
    await this.날짜줄보이게();
    const 모음: string[] = [];
    let 그대로 = 0;
    for (let 번 = 0; 번 < 최대밀기 && 그대로 < 2; 번 += 1) {
      const 앞수 = 모음.length;
      for (const 칩 of await this.보이는날짜칩들()) {
        const 글 = await this.날짜칩글(칩);
        if (!모음.includes(글)) 모음.push(글);
      }
      그대로 = 모음.length === 앞수 ? 그대로 + 1 : 0;
      await this.driver.swipe({ direction: 'left', scrollableElement: await this.날짜줄.getElement(), percent: 0.6 });
    }
    return 모음;
  }

  async 날짜칩찾기(날: Date, 최대밀기 = 8): Promise<요소> {
    await this.날짜줄보이게();
    const 글 = 월일글(날);
    for (let 번 = 0; 번 <= 최대밀기; 번 += 1) {
      for (const 칩 of await this.보이는날짜칩들()) if ((await this.날짜칩글(칩)) === 글) return 칩;
      await this.driver.swipe({ direction: 'left', scrollableElement: await this.날짜줄.getElement(), percent: 0.5 });
    }
    throw new Error(`배송 희망일 칩 「${글}」을 찾지 못했다`);
  }

  async 날짜고르기(날: Date): Promise<void> {
    const 칩 = await this.날짜칩찾기(날);
    await 칩.click();
    await this.driver.waitUntil(async () => 켜졌나(칩), { timeout: 10000, interval: 300 });
  }

  async 결제수단고르기(이름: 결제수단): Promise<void> {
    await this.보일때까지밀기(await this.결제수단칸(이름).getElement());
    await this.결제수단칸(이름).click();
  }

  async 결제수단보이나(이름: 결제수단): Promise<boolean> {
    await this.보일때까지밀기(await this.결제수단칸(이름).getElement());
    return this.결제수단칸(이름).isDisplayed();
  }

  async 결제수단이름(이름: 결제수단): Promise<string> {
    return this.결제수단칸(이름).$('android.widget.TextView').getText();
  }

  async 쿠폰칸보이게(): Promise<void> {
    await this.보일때까지밀기(await this.사용안함.getElement());
  }

  async 사용안함이름(): Promise<string> {
    await this.쿠폰칸보이게();
    return this.사용안함.$('android.widget.TextView').getText();
  }

  async 쿠폰들(): Promise<요소[]> {
    await this.쿠폰칸보이게();
    return [...(await this.driver.$$(쿠폰들주소))];
  }

  쿠폰(칸이름: string) {
    return this.driver.$(`id=${칸이름}`);
  }

  async 고를수있는쿠폰누르기(): Promise<void> {
    for (const 쿠폰 of await this.쿠폰들()) {
      if (await 쿠폰.isEnabled()) {
        await 쿠폰.click();
        return;
      }
    }
    throw new Error('고를 수 있는 쿠폰이 없다');
  }

  async 금액칸보이게(): Promise<void> {
    await this.보일때까지밀기(await this.최종결제금액.getElement());
  }

  async 상품금액값(): Promise<number> {
    await this.금액칸보이게();
    return 금액(await this.상품금액.getText());
  }

  async 쿠폰할인글(): Promise<string> {
    await this.금액칸보이게();
    return this.쿠폰할인.getText();
  }

  async 쿠폰할인값(): Promise<number> {
    return Math.abs(금액(await this.쿠폰할인글()));
  }

  async 쿠폰할인이바뀔때까지(앞글: string, timeout = 10000): Promise<void> {
    await this.driver.waitUntil(async () => (await this.쿠폰할인.getText()) !== 앞글, { timeout, interval: 300 });
  }

  async 배송비값(): Promise<number> {
    await this.금액칸보이게();
    return 금액(await this.배송비.getText());
  }

  async 최종결제금액값(): Promise<number> {
    await this.금액칸보이게();
    return 금액(await this.최종결제금액.getText());
  }

  async 금액줄세로자리들(): Promise<number[]> {
    await this.금액칸보이게();
    return [
      (await this.상품금액.getLocation()).y,
      (await this.쿠폰할인.getLocation()).y,
      (await this.배송비.getLocation()).y,
      (await this.최종결제금액.getLocation()).y,
    ];
  }

  async 동의칸보이게(): Promise<void> {
    await this.보일때까지밀기(await this.결제버튼.getElement());
  }

  async 동의했나(): Promise<boolean> {
    return 켜졌나(await this.동의.getElement());
  }

  async 동의하기(): Promise<void> {
    await this.동의칸보이게();
    if (!(await this.동의했나())) await this.동의.click();
    await this.driver.waitUntil(async () => this.동의했나(), { timeout: 10000, interval: 300 });
  }

  async 결제버튼눌리나(): Promise<boolean> {
    await this.동의칸보이게();
    return this.결제버튼.isEnabled();
  }

  async 결제버튼글(): Promise<string> {
    await this.동의칸보이게();
    return this.결제버튼.$('android.widget.TextView').getText();
  }

  async 결제누르기(): Promise<void> {
    await this.동의칸보이게();
    await this.결제버튼.click();
  }

  async 결제두번누르기(): Promise<void> {
    await this.동의칸보이게();
    const 버튼 = await this.결제버튼.getElement();
    await Promise.all([버튼.click(), 버튼.click()]);
  }

  async 다채우기(값: 주문서값, 오늘: Date, 뺄칸?: 주문칸): Promise<void> {
    if (뺄칸 !== '받는 분') await this.받는분적기(값.받는분);
    if (뺄칸 !== '연락처') await this.연락처적기(값.연락처);
    if (뺄칸 !== '주소') await this.주소넣기(값.검색어);
    if (뺄칸 !== '상세 주소') await this.상세주소적기(값.상세주소);
    if (뺄칸 !== '배송 희망일') await this.날짜고르기(일요일아닌첫날(오늘));
    if (뺄칸 !== '결제 수단') await this.결제수단고르기(값.결제수단);
    await this.동의하기();
  }
}

