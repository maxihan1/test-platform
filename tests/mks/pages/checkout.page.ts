import type { Locator, Page } from '@playwright/test';

import { 주소검색창 } from './address-popup.page.js';

export interface 배송값 {
  받는분: string | null;
  연락처: string | null;
  주소검색: boolean;
  상세주소: string | null;
  배송희망일: string | null;
}

export function 정상배송값(배송희망일: string): 배송값 {
  return { 받는분: '홍길동', 연락처: '01012345678', 주소검색: true, 상세주소: '5층', 배송희망일 };
}

export class 주문서화면 {
  static readonly 주소 = '/checkout';

  readonly 제목: Locator;
  readonly 단계항목들: Locator;
  readonly 현재단계: Locator;

  readonly 받는분: Locator;
  readonly 연락처: Locator;
  readonly 우편번호: Locator;
  readonly 상세주소: Locator;
  readonly 배송요청: Locator;
  readonly 요청직접입력: Locator;
  readonly 배송희망일: Locator;
  readonly 주소검색: Locator;
  readonly 상세주소포커스: Locator;
  readonly 오류들: Locator;

  readonly 신용카드: Locator;
  readonly 쿠폰: Locator;
  readonly 결제금액미리보기: Locator;

  readonly 동의: Locator;
  readonly 결제하기: Locator;

  readonly 다음: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '주문서', level: 1 });
    this.단계항목들 = page.getByRole('list', { name: '주문 단계' }).getByRole('listitem');
    this.현재단계 = page.getByRole('list', { name: '주문 단계' }).locator('li[aria-current="step"]');

    this.받는분 = page.getByLabel('받는 분', { exact: true });
    this.연락처 = page.getByLabel('연락처', { exact: true });
    this.우편번호 = page.getByLabel('우편번호', { exact: true });
    this.상세주소 = page.getByLabel('상세 주소', { exact: true });
    this.배송요청 = page.getByLabel('배송 요청 사항', { exact: true });
    this.요청직접입력 = page.getByLabel('요청 사항 직접 입력', { exact: true });
    this.배송희망일 = page.getByLabel('배송 희망일', { exact: true });
    this.주소검색 = page.getByRole('button', { name: '주소 검색', exact: true });
    this.상세주소포커스 = this.상세주소.and(page.locator(':focus'));
    this.오류들 = page.locator('p.error-text');

    this.신용카드 = page.getByRole('radio', { name: '신용카드' });
    this.쿠폰 = page.getByLabel('쿠폰', { exact: true });
    this.결제금액미리보기 = page.getByText(/^결제 금액 [\d,]+원$/);

    this.동의 = page.getByRole('checkbox', { name: '주문 내용을 확인했으며 결제에 동의합니다' });
    this.결제하기 = page.getByRole('button', { name: /원 결제하기$/ });

    this.다음 = page.getByRole('button', { name: '다음', exact: true });
  }

  오류글(문구: string): Locator {
    return this.page.getByText(문구, { exact: true });
  }

  async 열기(주소: string): Promise<void> {
    await this.page.goto(주소);
    await this.받는분.waitFor();
  }

  async 주소검색열기(): Promise<Page> {
    const [창] = await Promise.all([this.page.waitForEvent('popup'), this.주소검색.click()]);
    await 창.waitForLoadState();
    return 창;
  }

  async 주소검색으로채우기(검색어 = '테헤란로'): Promise<void> {
    const 창 = new 주소검색창(await this.주소검색열기());
    await 창.검색하기(검색어);
    await 창.결과들.first().waitFor();
    const 닫힘 = 창.page.waitForEvent('close');
    await 창.첫결과고르기();
    await 닫힘;
    await this.상세주소포커스.waitFor();
  }

  async 배송정보채우기(값: 배송값): Promise<void> {
    if (값.받는분 !== null) await this.받는분.fill(값.받는분);
    if (값.연락처 !== null) await this.연락처.fill(값.연락처);
    if (값.주소검색) await this.주소검색으로채우기();
    if (값.상세주소 !== null) await this.상세주소.fill(값.상세주소);
    if (값.배송희망일 !== null) await this.배송희망일.fill(값.배송희망일);
  }

  async 다음누르기(): Promise<void> {
    await this.다음.click();
  }

  async 다음누른결과기다리기(): Promise<void> {
    await this.오류들.filter({ hasText: /\S/ }).or(this.쿠폰).first().waitFor();
  }

  async 결제수단단계로가기(값: 배송값): Promise<void> {
    await this.배송정보채우기(값);
    await this.다음누르기();
    await this.쿠폰.waitFor();
  }

  async 현재단계글(): Promise<string> {
    return (await this.현재단계.innerText()).trim();
  }

  async 단계이름들(): Promise<string[]> {
    const 글들 = await this.단계항목들.allInnerTexts();
    return 글들.map((글) => 글.replace(/^[①②③]\s*/, '').trim());
  }

  async 결제금액(): Promise<number> {
    return Number((await this.결제금액미리보기.innerText()).replace(/[^0-9]/g, ''));
  }

  async 쿠폰3천원고르기(): Promise<void> {
    await this.쿠폰.selectOption({ label: '3,000원 할인 (30,000원 이상 구매 시)' });
  }
}
