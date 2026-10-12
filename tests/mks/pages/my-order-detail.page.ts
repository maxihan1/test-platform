import type { Locator, Page } from '@playwright/test';

export class 내주문상세화면 {
  static readonly 주소 = '/my/orders/DM20261010-0001';

  readonly 제목: Locator;
  readonly 상품목록제목: Locator;
  readonly 주문취소: Locator;
  readonly 권한없음: Locator;
  readonly 못찾음: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '주문 상세', level: 1 });
    this.상품목록제목 = page.getByRole('heading', { name: '주문 상품', level: 2 });
    this.주문취소 = page.getByRole('button', { name: '주문 취소', exact: true });
    this.권한없음 = page.getByRole('heading', { name: '권한이 없습니다', level: 2 });
    this.못찾음 = page.getByRole('heading', { name: '주문을 찾을 수 없습니다', level: 2 });
  }

  async 열기(주문번호: string): Promise<void> {
    await this.page.goto(`/my/orders/${encodeURIComponent(주문번호)}`);
  }

  주문번호표시(주문번호: string): Locator {
    return this.page.getByRole('definition').filter({ hasText: 주문번호 });
  }
}
