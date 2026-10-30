import type { Locator, Page } from '@playwright/test';

export class 회원주문상세화면 {
  static readonly 주소 = '/my/orders/<번호>';
  readonly 주문상품제목: Locator;
  readonly 오류안내: Locator;
  readonly 주문취소버튼: Locator;

  constructor(readonly page: Page) {
    this.주문상품제목 = page.getByRole('heading', { name: '주문 상품' });
    this.오류안내 = page.getByRole('link', { name: '주문 내역으로' });
    this.주문취소버튼 = page.getByRole('button', { name: '주문 취소', exact: true });
  }

  async 열기(주문번호: string): Promise<void> {
    await this.page.goto(`/my/orders/${encodeURIComponent(주문번호)}`);
    await this.주문상품제목.or(this.오류안내).waitFor();
  }
}
