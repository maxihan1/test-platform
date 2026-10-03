import type { Locator, Page } from '@playwright/test';

export class 장바구니화면 {
  constructor(private readonly page: Page) {}

  async 열기(): Promise<void> {
    await this.page.goto('/cart');
  }

  제목(): Locator {
    return this.page.getByRole('heading', { name: '장바구니', exact: true });
  }

  불러오는중표시(): Locator {
    return this.page.getByLabel('불러오는 중', { exact: true });
  }

  빈장바구니문구(): Locator {
    return this.page.getByText('장바구니가 비어 있습니다', { exact: true });
  }

  쇼핑하러가기버튼(): Locator {
    return this.page.getByRole('link', { name: '쇼핑하러 가기', exact: true });
  }

  전체선택체크(): Locator {
    return this.page.getByRole('checkbox', { name: '전체 선택', exact: true });
  }

  선택삭제버튼(): Locator {
    return this.page.getByRole('button', { name: '선택 삭제', exact: true });
  }

  줄들(): Locator {
    return this.page.getByRole('table').getByRole('row').filter({ has: this.page.getByRole('checkbox') });
  }

  줄(상품명: string): Locator {
    return this.줄들().filter({ has: this.page.getByRole('link', { name: 상품명, exact: true }) });
  }

  줄체크(상품명: string): Locator {
    return this.줄(상품명).getByRole('checkbox');
  }

  줄체크들(): Locator {
    return this.줄들().getByRole('checkbox');
  }

  줄상품명들(): Locator {
    return this.줄들().getByRole('link');
  }

  줄이미지(상품명: string): Locator {
    return this.줄(상품명).getByRole('img', { name: 상품명, exact: true });
  }

  줄상품명링크(상품명: string): Locator {
    return this.줄(상품명).getByRole('link', { name: 상품명, exact: true });
  }

  줄옵션(상품명: string, 옵션글: string): Locator {
    return this.줄(상품명).getByText(옵션글, { exact: true });
  }

  줄수량칸(상품명: string): Locator {
    return this.줄(상품명).getByRole('spinbutton');
  }

  줄수량늘리기버튼(상품명: string): Locator {
    return this.줄(상품명).getByRole('button', { name: '수량 늘리기', exact: true });
  }

  줄금액(상품명: string): Locator {
    return this.줄(상품명).locator('.line-total');
  }

  결제요약(): Locator {
    return this.page.getByRole('complementary', { name: '결제 요약', exact: true });
  }

  상품금액(): Locator {
    return this.결제요약().locator('.sum-goods');
  }

  상품금액이(금액글자: string): Locator {
    return this.상품금액().filter({ hasText: new RegExp(`^${금액글자}$`) });
  }

  배송비(): Locator {
    return this.결제요약().locator('.sum-ship');
  }

  결제예정금액(): Locator {
    return this.결제요약().locator('.sum-total');
  }

  무료배송안내(): Locator {
    return this.결제요약().getByText(/더 담으면 무료 배송$/);
  }

  주문하기버튼(): Locator {
    return this.결제요약().getByRole('button', { name: '주문하기', exact: true });
  }

  삭제확인문구(문구: string): Locator {
    return this.page.getByRole('dialog').getByText(문구, { exact: true });
  }
}
