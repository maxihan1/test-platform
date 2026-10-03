import type { Locator, Page } from '@playwright/test';

export class 주문상세화면 {
  constructor(private readonly page: Page) {}

  get 제목(): Locator {
    return this.page.getByRole('heading', { name: '주문 상세' });
  }

  get 주문내역으로링크(): Locator {
    return this.page.getByRole('link', { name: '주문 내역으로' });
  }

  get 주문취소버튼(): Locator {
    return this.page.getByRole('button', { name: '주문 취소', exact: true });
  }

  get 상품목록제목(): Locator {
    return this.page.getByRole('heading', { name: '주문 상품' });
  }

  get 배송정보제목(): Locator {
    return this.page.getByRole('heading', { name: '배송 정보' });
  }

  get 결제정보제목(): Locator {
    return this.page.getByRole('heading', { name: '결제 정보' });
  }

  get 주문상태이름(): Locator {
    return this.page.getByText('주문 상태', { exact: true });
  }

  get 상태글자(): Locator {
    return this.page.locator('dl.info .status');
  }

  get 안내제목(): Locator {
    return this.page.getByRole('heading', { level: 2 }).filter({ hasNotText: '마이페이지' });
  }

  get 취소모달(): Locator {
    return this.page.getByRole('dialog', { name: '주문 취소' });
  }

  get 사유선택(): Locator {
    return this.취소모달.getByRole('combobox');
  }

  get 사유옵션들(): Locator {
    return this.사유선택.getByRole('option');
  }

  get 사유입력(): Locator {
    return this.취소모달.getByRole('textbox');
  }

  get 취소신청버튼(): Locator {
    return this.취소모달.getByRole('button', { name: '취소 신청', exact: true });
  }

  get 모달오류(): Locator {
    return this.취소모달.getByRole('alert');
  }

  async 열기(주문번호: string): Promise<void> {
    await this.page.goto(`/my/orders/${encodeURIComponent(주문번호)}`);
    await this.주문상태이름.or(this.주문내역으로링크).first().waitFor();
  }

  async 취소모달을연다(): Promise<void> {
    await this.주문취소버튼.click();
    await this.취소모달.waitFor();
  }

  async 사유를고른다(사유: string): Promise<void> {
    await this.사유선택.selectOption({ label: 사유 });
  }
}
