import type { Locator, Page } from '@playwright/test';

export class 주문완료화면 {
  static readonly 주소 = '/checkout/done';

  readonly 제목: Locator;
  readonly 주문번호: Locator;
  readonly 결제금액: Locator;
  readonly 주문내역보기: Locator;
  readonly 쇼핑계속하기: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '주문이 완료되었습니다', level: 1 });
    this.주문번호 = page.locator('dd.order-id');
    this.결제금액 = page.locator('dd.order-total');
    this.주문내역보기 = page.getByRole('link', { name: '주문 내역 보기' });
    this.쇼핑계속하기 = page.getByRole('link', { name: '쇼핑 계속하기' });
  }
}
