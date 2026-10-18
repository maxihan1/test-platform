import type { Locator, Page } from '@playwright/test';
import { 머리글 } from '../components/header.component.js';

export class 주문완료화면 {
  static readonly 주소 = '/checkout/done';
  readonly 제목: Locator;
  readonly 주문번호: Locator;
  readonly 결제금액: Locator;
  readonly 주문내역보기: Locator;
  readonly 쇼핑계속하기: Locator;
  readonly 주문내역제목: Locator;
  readonly 머리글: 머리글;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '주문이 완료되었습니다', level: 1 });
    this.주문번호 = page.locator('dt:text-is("주문번호") + dd');
    this.결제금액 = page.locator('dt:text-is("결제 금액") + dd');
    this.주문내역보기 = page.getByRole('link', { name: '주문 내역 보기' });
    this.쇼핑계속하기 = page.getByRole('link', { name: '쇼핑 계속하기' });
    this.주문내역제목 = page.getByRole('heading', { name: '주문 내역', level: 1 });
    this.머리글 = new 머리글(page);
  }

  async 열기(): Promise<void> {
    await this.page.goto(주문완료화면.주소);
    await this.제목.waitFor();
    await this.머리글.그려질때까지();
  }

  async 주문번호나올때까지(): Promise<string> {
    await this.제목.waitFor();
    await this.주문번호.filter({ hasText: /\S/ }).waitFor();
    return this.주문번호.innerText();
  }
}
