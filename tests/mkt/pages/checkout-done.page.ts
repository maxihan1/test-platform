import type { Locator, Page } from '@playwright/test';

export class 주문완료 {
  constructor(private readonly page: Page) {}

  get 제목(): Locator {
    return this.page.getByRole('heading', { name: '주문이 완료되었습니다' });
  }

  get 주문번호(): Locator {
    return this.page.locator('dd.order-id');
  }

  get 결제금액(): Locator {
    return this.page.locator('dd.order-total');
  }

  get 주문내역보기(): Locator {
    return this.page.getByRole('link', { name: '주문 내역 보기' });
  }

  get 쇼핑계속하기(): Locator {
    return this.page.getByRole('link', { name: '쇼핑 계속하기' });
  }
}
