import type { Locator, Page } from '@playwright/test';

export class 주문완료화면 {
  constructor(private readonly page: Page) {}

  제목(): Locator {
    return this.page.getByRole('heading', { name: '주문이 완료되었습니다', level: 1, exact: true });
  }

  주문번호(): Locator {
    return this.page.locator('.order-id');
  }

  결제금액(): Locator {
    return this.page.locator('.order-total');
  }

  주문내역보기링크(): Locator {
    return this.page.getByRole('link', { name: '주문 내역 보기', exact: true });
  }

  쇼핑계속하기링크(): Locator {
    return this.page.getByRole('link', { name: '쇼핑 계속하기', exact: true });
  }
}
