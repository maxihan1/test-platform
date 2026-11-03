import type { Locator, Page } from '@playwright/test';

import { 운영틀 } from '../components/ops-frame.component.js';

export interface 시험데이터입력 {
  결제완료?: number;
  배송중?: number;
  배송완료?: number;
  주문취소?: number;
  장바구니?: number | null;
  안읽은알림?: number;
}

export class 시험데이터화면 {
  static readonly 주소 = '/ops/fixtures';
  readonly 제목: Locator;
  readonly 회원아이디: Locator;
  readonly 결제완료주문: Locator;
  readonly 배송중주문: Locator;
  readonly 배송완료주문: Locator;
  readonly 주문취소주문: Locator;
  readonly 장바구니상품: Locator;
  readonly 안읽은알림: Locator;
  readonly 숫자칸: Locator;
  readonly 만들기: Locator;
  readonly 결과줄: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '시험 데이터', level: 1 });
    this.회원아이디 = page.getByLabel('회원 아이디', { exact: true });
    this.결제완료주문 = page.getByLabel('결제완료 주문', { exact: true });
    this.배송중주문 = page.getByLabel('배송중 주문', { exact: true });
    this.배송완료주문 = page.getByLabel('배송완료 주문', { exact: true });
    this.주문취소주문 = page.getByLabel('주문취소 주문', { exact: true });
    this.장바구니상품 = page.getByLabel('장바구니 상품 (이 개수로 맞춤, 비우면 그대로)', { exact: true });
    this.안읽은알림 = page.getByLabel('안 읽은 알림', { exact: true });
    this.숫자칸 = page.getByRole('spinbutton');
    this.만들기 = page.getByRole('button', { name: '만들기', exact: true });
    this.결과줄 = page.locator('#fx-result');
  }

  빠른묶음(이름: string): Locator {
    return this.page.getByRole('button', { name: 이름, exact: true });
  }

  async 그려질때까지(): Promise<void> {
    await this.제목.waitFor();
    await this.만들기.waitFor();
    await new 운영틀(this.page).다그려질때까지();
  }

  async 열기(): Promise<void> {
    await this.page.goto(시험데이터화면.주소);
    await this.그려질때까지();
  }

  async 칸채우기(칸: 시험데이터입력): Promise<void> {
    if (칸.결제완료 !== undefined) await this.결제완료주문.fill(String(칸.결제완료));
    if (칸.배송중 !== undefined) await this.배송중주문.fill(String(칸.배송중));
    if (칸.배송완료 !== undefined) await this.배송완료주문.fill(String(칸.배송완료));
    if (칸.주문취소 !== undefined) await this.주문취소주문.fill(String(칸.주문취소));
    if (칸.장바구니 !== undefined) await this.장바구니상품.fill(칸.장바구니 === null ? '' : String(칸.장바구니));
    if (칸.안읽은알림 !== undefined) await this.안읽은알림.fill(String(칸.안읽은알림));
  }

  async 만들기누르기(회원아이디: string, 칸: 시험데이터입력): Promise<void> {
    await this.회원아이디.fill(회원아이디);
    await this.칸채우기(칸);
    await this.만들기.click();
  }
}
