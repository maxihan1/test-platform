import type { Locator, Page } from '@playwright/test';

import { 마이페이지메뉴 } from '../components/member-helpers.component.js';

export interface 주문줄 {
  주문일: string;
  주문번호: string;
  상품명: string;
  결제금액: string;
  상태: string;
}

export class 주문내역화면 {
  readonly 제목: Locator;
  readonly 메뉴: 마이페이지메뉴;
  readonly 기간묶음: Locator;
  readonly 표: Locator;
  readonly 주문줄들: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '주문 내역', level: 1 });
    this.메뉴 = new 마이페이지메뉴(page);
    this.기간묶음 = page.getByRole('group', { name: '조회 기간' });
    this.표 = page.getByRole('table');
    this.주문줄들 = this.표.getByRole('row').filter({ has: page.getByRole('link') });
  }

  기간버튼(이름: string): Locator {
    return this.기간묶음.getByRole('button', { name: 이름, exact: true });
  }

  상태표시(상태: string): Locator {
    return this.표.getByText(상태, { exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto('/my/orders');
    await this.제목.waitFor();
    await this.표.waitFor();
  }

  async 기간누르기(이름: string): Promise<void> {
    await this.기간버튼(이름).click();
    await this.표.waitFor();
  }

  async 주문줄읽기(): Promise<주문줄[]> {
    const 줄들 = await this.주문줄들.allInnerTexts();
    return 줄들.map((줄) => {
      const [주문일 = '', 주문번호 = '', 상품명 = '', 결제금액 = '', 상태 = ''] = 줄.split('\t');
      return { 주문일, 주문번호, 상품명, 결제금액, 상태 };
    });
  }

  async 상태글자색(상태: string): Promise<string> {
    return this.상태표시(상태).evaluate((el) => getComputedStyle(el).color);
  }

  async 첫줄누르기(): Promise<string> {
    const 첫째 = this.주문줄들.first();
    const 번호 = await 첫째.getByRole('link').innerText();
    await 첫째.click();
    return 번호;
  }
}
