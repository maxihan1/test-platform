import type { Locator, Page } from '@playwright/test';

export class 주문상세화면 {
  constructor(private readonly page: Page) {}

  async 열기(주문번호: string): Promise<void> {
    await this.page.goto(`/my/orders/${encodeURIComponent(주문번호)}`);
  }

  제목(): Locator {
    return this.page.getByRole('heading', { name: '주문 상세', level: 1, exact: true });
  }

  상품목록제목(): Locator {
    return this.page.getByRole('heading', { name: '주문 상품', exact: true });
  }

  상품목록(): Locator {
    return this.page.getByRole('table');
  }

  상품행들(): Locator {
    return this.상품목록().getByRole('row').filter({ has: this.page.getByRole('cell') });
  }

  배송정보제목(): Locator {
    return this.page.getByRole('heading', { name: '배송 정보', exact: true });
  }

  결제정보제목(): Locator {
    return this.page.getByRole('heading', { name: '결제 정보', exact: true });
  }

  상태글자(): Locator {
    return this.page.locator('.status');
  }

  취소버튼(): Locator {
    return this.page.getByRole('button', { name: '주문 취소', exact: true });
  }

  주문내역으로링크(): Locator {
    return this.page.getByRole('link', { name: '주문 내역으로', exact: true });
  }

  권한없음문구(): Locator {
    return this.page.getByRole('heading', { name: '권한이 없습니다', exact: true });
  }

  취소사유선택(): Locator {
    return this.page.getByLabel('취소 사유', { exact: true });
  }

  취소사유입력라벨(): Locator {
    return this.page.getByText('사유 입력', { exact: true });
  }

  취소사유입력칸(): Locator {
    return this.page.getByLabel('사유 입력', { exact: true });
  }

  async 취소사유목록(): Promise<string[]> {
    return this.취소사유선택().getByRole('option').allInnerTexts();
  }

  async 취소사유고르기(이름: string): Promise<void> {
    await this.취소사유선택().selectOption({ label: 이름 });
  }
}
