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
  readonly 단계목록: Locator;
  readonly 단계항목들: Locator;
  readonly 현재단계: Locator;

  readonly 받는분: Locator;
  readonly 연락처: Locator;
  readonly 우편번호: Locator;
  readonly 주소: Locator;
  readonly 상세주소: Locator;
  readonly 배송요청: Locator;
  readonly 배송요청항목들: Locator;
  readonly 요청직접입력: Locator;
  readonly 배송희망일: Locator;
  readonly 주소검색: Locator;
  readonly 받는분오류: Locator;
  readonly 연락처오류: Locator;
  readonly 주소오류: Locator;
  readonly 상세주소오류: Locator;
  readonly 배송희망일오류: Locator;
  readonly 일요일안내: Locator;
  readonly 상세주소포커스: Locator;

  readonly 신용카드: Locator;
  readonly 계좌이체: Locator;
  readonly 무통장입금: Locator;
  readonly 카드사: Locator;
  readonly 할부: Locator;
  readonly 할부항목들: Locator;
  readonly 할부안내: Locator;
  readonly 쿠폰: Locator;
  readonly 쿠폰항목들: Locator;
  readonly 결제금액미리보기: Locator;

  readonly 최종확인영역: Locator;
  readonly 상품목록제목: Locator;
  readonly 배송정보제목: Locator;
  readonly 결제수단제목: Locator;
  readonly 결제금액제목: Locator;
  readonly 금액이름들: Locator;
  readonly 금액값들: Locator;
  readonly 동의: Locator;
  readonly 결제하기: Locator;
  readonly 로딩표시: Locator;
  readonly 결제중버튼: Locator;

  readonly 다음: Locator;
  readonly 이전: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '주문서', level: 1 });
    this.단계목록 = page.getByRole('list', { name: '주문 단계' });
    this.단계항목들 = this.단계목록.getByRole('listitem');
    this.현재단계 = this.단계목록.locator('li[aria-current="step"]');

    this.받는분 = page.getByLabel('받는 분', { exact: true });
    this.연락처 = page.getByLabel('연락처', { exact: true });
    this.우편번호 = page.getByLabel('우편번호', { exact: true });
    this.주소 = page.getByLabel('주소', { exact: true });
    this.상세주소 = page.getByLabel('상세 주소', { exact: true });
    this.배송요청 = page.getByLabel('배송 요청 사항', { exact: true });
    this.배송요청항목들 = this.배송요청.getByRole('option');
    this.요청직접입력 = page.getByLabel('요청 사항 직접 입력', { exact: true });
    this.배송희망일 = page.getByLabel('배송 희망일', { exact: true });
    this.주소검색 = page.getByRole('button', { name: '주소 검색', exact: true });
    this.받는분오류 = page.locator('p[data-err="receiver"]');
    this.연락처오류 = page.locator('p[data-err="phone"]');
    this.주소오류 = page.locator('p[data-err="address"]');
    this.상세주소오류 = page.locator('p[data-err="detail"]');
    this.배송희망일오류 = page.locator('p[data-err="deliveryDate"]');
    this.일요일안내 = page.getByText('일요일은 배송하지 않습니다', { exact: true });
    this.상세주소포커스 = this.상세주소.and(page.locator(':focus'));

    this.신용카드 = page.getByRole('radio', { name: '신용카드' });
    this.계좌이체 = page.getByRole('radio', { name: '계좌이체' });
    this.무통장입금 = page.getByRole('radio', { name: '무통장입금' });
    this.카드사 = page.getByLabel('카드사', { exact: true });
    this.할부 = page.getByLabel('할부', { exact: true });
    this.할부항목들 = this.할부.getByRole('option');
    this.할부안내 = page.getByText('할부는 결제 금액 50,000원 이상일 때만 고를 수 있습니다', { exact: true });
    this.쿠폰 = page.getByLabel('쿠폰', { exact: true });
    this.쿠폰항목들 = this.쿠폰.getByRole('option');
    this.결제금액미리보기 = page.getByText(/^결제 금액 [\d,]+원$/);

    this.최종확인영역 = page.locator('form[data-step="3"]');
    this.상품목록제목 = this.최종확인영역.getByRole('heading', { name: '상품 목록', level: 2 });
    this.배송정보제목 = this.최종확인영역.getByRole('heading', { name: '배송 정보', level: 2 });
    this.결제수단제목 = this.최종확인영역.getByRole('heading', { name: '결제 수단', level: 2 });
    this.결제금액제목 = this.최종확인영역.getByRole('heading', { name: '결제 금액', level: 2 });
    this.금액이름들 = this.최종확인영역.getByRole('term');
    this.금액값들 = this.최종확인영역.getByRole('definition');
    this.동의 = page.getByRole('checkbox', { name: '주문 내용을 확인했으며 결제에 동의합니다' });
    this.결제하기 = page.getByRole('button', { name: /원 결제하기$/ });
    this.로딩표시 = this.최종확인영역.getByLabel('처리 중');
    this.결제중버튼 = this.최종확인영역.getByRole('button').filter({ has: page.getByLabel('처리 중') });

    this.다음 = page.getByRole('button', { name: '다음', exact: true });
    this.이전 = page.getByRole('button', { name: '이전', exact: true });
  }

  할부옵션(이름: string): Locator {
    return this.할부.getByRole('option', { name: 이름, exact: true });
  }

  쿠폰옵션(이름: string): Locator {
    return this.쿠폰.getByRole('option', { name: 이름, exact: true });
  }

  오류글(문구: string): Locator {
    return this.page.getByText(문구, { exact: true });
  }

  async 열기(줄번호들: number[]): Promise<void> {
    await this.page.goto(`${주문서화면.주소}?items=${줄번호들.join(',')}`);
    await this.받는분.waitFor();
    await this.쿠폰.getByRole('option', { includeHidden: true }).nth(1).waitFor({ state: 'attached' });
  }

  async 주소검색열기(): Promise<Page> {
    const [창] = await Promise.all([this.page.waitForEvent('popup'), this.주소검색.click()]);
    await 창.waitForLoadState();
    return 창;
  }

  async 주소검색으로채우기(검색어 = '테헤란'): Promise<void> {
    const 창 = new 주소검색창(await this.주소검색열기());
    await 창.검색하기(검색어);
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

  async 결제수단고르기(이름: '신용카드' | '계좌이체' | '무통장입금'): Promise<void> {
    await this.page.getByRole('radio', { name: 이름 }).check();
  }

  async 현재단계글(): Promise<string> {
    return (await this.현재단계.innerText()).trim();
  }

  async 금액표(): Promise<Record<string, string>> {
    const 이름들 = await this.금액이름들.allInnerTexts();
    const 값들 = await this.금액값들.allInnerTexts();
    return Object.fromEntries(이름들.map((이름, i) => [이름.trim(), (값들[i] ?? '').trim()]));
  }
}
