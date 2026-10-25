import type { Locator, Page } from '@playwright/test';

export class 주문내역화면 {
  static readonly 주소 = '/my/orders';
  readonly 표: Locator;
  readonly 빈안내: Locator;

  constructor(readonly page: Page) {
    this.표 = page.locator('#orders table.orders');
    this.빈안내 = page.locator('#orders').getByText('주문 내역이 없습니다');
  }

  async 열기(): Promise<void> {
    await this.page.goto(주문내역화면.주소);
    await this.page.locator('#orders .skeleton').waitFor({ state: 'detached' });
  }

  주문줄(orderId: string): Locator {
    return this.page.locator(`#orders .order-row[data-id="${orderId}"]`);
  }

  상태(orderId: string): Locator {
    return this.주문줄(orderId).locator('.status');
  }
}
