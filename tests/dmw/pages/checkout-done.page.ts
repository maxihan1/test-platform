import type { Locator, Page } from '@playwright/test';

export class 주문완료화면 {
  static readonly 주소 = '/checkout/done';

  readonly 제목: Locator;
  readonly 주문번호: Locator;
  readonly 결제금액: Locator;
  readonly 주문내역보기: Locator;
  readonly 쇼핑계속하기: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { level: 1, name: '주문이 완료되었습니다', exact: true });
    this.주문번호 = page.locator('.order-id');
    this.결제금액 = page.locator('.order-total');
    this.주문내역보기 = page.getByRole('link', { name: '주문 내역 보기', exact: true });
    this.쇼핑계속하기 = page.getByRole('link', { name: '쇼핑 계속하기', exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto(주문완료화면.주소);
    await this.제목.waitFor();
  }

  async 다그려질때까지(): Promise<void> {
    await this.제목.waitFor();
  }

  async 주문번호글(): Promise<string> {
    return this.주문번호.innerText();
  }

  async 결제금액읽기(): Promise<number> {
    return Number((await this.결제금액.innerText()).replace(/\D/g, ''));
  }
}
