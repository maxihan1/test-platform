import type { Locator, Page } from '@playwright/test';

import { 운영틀 } from '../components/ops-frame.component.js';

export class 대시보드화면 {
  static readonly 주소 = '/ops';
  readonly 틀: 운영틀;
  readonly 제목: Locator;
  readonly 회원수카드: Locator;
  readonly 오늘주문카드: Locator;
  readonly 답변대기카드: Locator;
  readonly 품절카드: Locator;
  readonly 불안정모드카드: Locator;

  constructor(readonly page: Page) {
    this.틀 = new 운영틀(page);
    this.제목 = this.틀.본문.getByRole('heading', { name: '대시보드', level: 1 });
    this.회원수카드 = this.카드('잠긴 회원');
    this.오늘주문카드 = this.카드('오늘 주문');
    this.답변대기카드 = this.카드('답변 대기 문의');
    this.품절카드 = this.카드('품절 상품');
    this.불안정모드카드 = this.카드('불안정 모드');
  }

  private 카드(글자: string): Locator {
    return this.틀.본문.getByRole('link').filter({ hasText: 글자 });
  }

  상태카드(상태: '결제완료' | '배송중' | '배송완료' | '주문취소'): Locator {
    return this.카드(상태);
  }

  도착제목(이름: string): Locator {
    return this.틀.본문.getByRole('heading', { name: 이름, level: 1 });
  }

  거른상태칩(상태: string): Locator {
    return this.틀.본문.getByRole('button', { name: new RegExp(`^${상태}`), pressed: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto(대시보드화면.주소);
    await this.틀.다그려질때까지();
  }

  async 이동끝날때까지(메뉴: string): Promise<void> {
    await this.틀.지금메뉴.filter({ hasText: 메뉴 }).waitFor();
    await this.틀.다그려질때까지();
  }
}
