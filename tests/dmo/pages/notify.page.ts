import type { Locator, Page } from '@playwright/test';

import { 운영틀 } from '../components/ops-frame.component.js';

export class 알림쿠폰화면 {
  static readonly 주소 = '/ops/notify';
  readonly 제목: Locator;
  readonly 알림폼: Locator;
  readonly 알림받는회원: Locator;
  readonly 알림내용: Locator;
  readonly 글자수: Locator;
  readonly 보내기: Locator;
  readonly 쿠폰폼: Locator;
  readonly 쿠폰받는회원: Locator;
  readonly 할인금액: Locator;
  readonly 최소주문금액: Locator;
  readonly 미리보기: Locator;
  readonly 주기: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '알림 · 쿠폰', level: 1 });
    this.알림폼 = page.locator('form').filter({ has: page.getByRole('heading', { name: '알림 보내기' }) });
    this.알림받는회원 = this.알림폼.getByLabel('받는 회원 아이디');
    this.알림내용 = this.알림폼.getByLabel('내용 (1~100자)');
    this.글자수 = this.알림폼.getByText(/^\d+ \/ 100$/);
    this.보내기 = this.알림폼.getByRole('button', { name: '보내기' });
    this.쿠폰폼 = page.locator('form').filter({ has: page.getByRole('heading', { name: '쿠폰 주기' }) });
    this.쿠폰받는회원 = this.쿠폰폼.getByLabel('받는 회원 아이디');
    this.할인금액 = this.쿠폰폼.getByLabel('할인 금액 (원)');
    this.최소주문금액 = this.쿠폰폼.getByLabel('최소 주문 금액 (원)');
    this.미리보기 = this.쿠폰폼.getByText(/운영 지급\)$/);
    this.주기 = this.쿠폰폼.getByRole('button', { name: '주기' });
  }

  async 그려질때까지(): Promise<void> {
    await this.제목.waitFor();
    await this.보내기.waitFor();
    await new 운영틀(this.page).다그려질때까지();
  }

  async 열기(): Promise<void> {
    await this.page.goto(알림쿠폰화면.주소);
    await this.그려질때까지();
  }

  async 알림적기(회원아이디: string, 내용: string): Promise<void> {
    await this.알림받는회원.fill(회원아이디);
    await this.알림내용.fill(내용);
  }

  async 알림보내기(회원아이디: string, 내용: string): Promise<void> {
    await this.알림적기(회원아이디, 내용);
    await this.보내기.click();
  }

  async 쿠폰적기(회원아이디: string, 할인: number, 최소주문: number): Promise<void> {
    await this.쿠폰받는회원.fill(회원아이디);
    await this.할인금액.fill(String(할인));
    await this.최소주문금액.fill(String(최소주문));
  }

  async 쿠폰주기(회원아이디: string, 할인: number, 최소주문: number): Promise<void> {
    await this.쿠폰적기(회원아이디, 할인, 최소주문);
    await this.주기.click();
  }

  async 쿠폰두번주기(회원아이디: string, 할인: number, 최소주문: number): Promise<void> {
    await this.쿠폰적기(회원아이디, 할인, 최소주문);
    await this.주기.dblclick();
  }
}
