import type { Locator, Page } from '@playwright/test';

export class 주문서화면 {
  static readonly 주소 = '/checkout';
  readonly 제목: Locator;
  readonly 받는분: Locator;
  readonly 연락처: Locator;
  readonly 주소검색: Locator;
  readonly 상세주소: Locator;
  readonly 배송희망일: Locator;
  readonly 배송정보다음: Locator;
  readonly 계좌이체: Locator;
  readonly 쿠폰: Locator;
  readonly 쿠폰선택지: Locator;
  readonly 결제수단다음: Locator;
  readonly 최종확인: Locator;
  readonly 상품금액: Locator;
  readonly 쿠폰할인: Locator;
  readonly 동의: Locator;
  readonly 결제하기: Locator;
  readonly 완료제목: Locator;
  readonly 주문번호: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '주문서', level: 1 });
    this.받는분 = page.getByLabel('받는 분', { exact: true });
    this.연락처 = page.getByLabel('연락처', { exact: true });
    this.주소검색 = page.getByRole('button', { name: '주소 검색', exact: true });
    this.상세주소 = page.getByLabel('상세 주소', { exact: true });
    this.배송희망일 = page.getByLabel('배송 희망일', { exact: true });
    this.배송정보다음 = page.getByRole('button', { name: '다음', exact: true });
    this.계좌이체 = page.getByRole('radio', { name: '계좌이체' });
    this.쿠폰 = page.getByRole('combobox', { name: '쿠폰' });
    this.쿠폰선택지 = this.쿠폰.getByRole('option');
    this.결제수단다음 = page.getByRole('button', { name: '다음', exact: true });
    this.최종확인 = page.getByRole('heading', { name: '최종 확인' });
    this.상품금액 = page.locator('dt:has-text("상품 금액") + dd');
    this.쿠폰할인 = page.locator('dt:has-text("쿠폰 할인") + dd');
    this.동의 = page.getByRole('checkbox', { name: '주문 내용을 확인했으며 결제에 동의합니다' });
    this.결제하기 = page.getByRole('button', { name: /결제하기$/ });
    this.완료제목 = page.getByRole('heading', { name: '주문이 완료되었습니다' });
    this.주문번호 = page.locator('dt:has-text("주문번호") + dd');
  }

  async 그려질때까지(): Promise<void> {
    await this.받는분.waitFor();
  }

  async 주소고르기(검색어: string): Promise<void> {
    const 팝업기다림 = this.page.waitForEvent('popup');
    await this.주소검색.click();
    const 팝업 = await 팝업기다림;
    await 팝업.getByLabel('도로명 주소 검색어').fill(검색어);
    await 팝업.getByRole('button', { name: '검색', exact: true }).click();
    const 결과 = 팝업.getByRole('list', { name: '검색 결과' }).getByRole('button').first();
    await 결과.waitFor();
    const 닫힘 = 팝업.waitForEvent('close');
    await 결과.dispatchEvent('click');
    await 닫힘;
    await this.상세주소.waitFor();
  }

  async 배송정보적고다음(): Promise<void> {
    await this.받는분.fill('홍길동');
    await this.연락처.fill('01012345678');
    await this.주소고르기('테헤란로');
    await this.상세주소.fill('101호');
    await this.배송희망일.fill(await this.가장빠른배송일());
    await this.배송정보다음.click();
    await this.계좌이체.waitFor();
  }

  async 가장빠른배송일(): Promise<string> {
    const 최소 = (await this.배송희망일.getAttribute('min')) ?? '';
    const [년, 월, 일] = 최소.split('-').map(Number);
    const 날 = new Date(년!, 월! - 1, 일!);
    if (날.getDay() === 0) 날.setDate(날.getDate() + 1);
    const 두자리 = (n: number) => String(n).padStart(2, '0');
    return `${날.getFullYear()}-${두자리(날.getMonth() + 1)}-${두자리(날.getDate())}`;
  }

  async 쿠폰단계까지(): Promise<void> {
    await this.배송정보적고다음();
    await this.쿠폰선택지.nth(1).waitFor({ state: 'attached' });
  }

  운영지급쿠폰(): Locator {
    return this.쿠폰선택지.filter({ hasText: '운영 지급' });
  }

  async 운영지급쿠폰앞쿠폰수(): Promise<number> {
    const 글들 = await this.쿠폰선택지.allTextContents();
    const 자리 = 글들.findIndex((글) => 글.includes('운영 지급'));
    return 자리 < 0 ? -1 : 자리 - 1;
  }

  async 운영지급쿠폰고르기(): Promise<void> {
    const 이름 = (await this.운영지급쿠폰().first().textContent()) ?? '';
    await this.쿠폰.selectOption({ label: 이름 });
  }

  async 결제수단고르고다음(): Promise<void> {
    await this.계좌이체.check();
    await this.결제수단다음.click();
    await this.최종확인.waitFor();
  }

  async 결제하기누르기(): Promise<void> {
    await this.동의.check();
    await this.결제하기.click();
    await this.완료제목.waitFor();
  }
}
