import type { Locator, Page } from '@playwright/test';

import { 모달 } from '../components/modal.component.js';

export class 주문상세화면 {
  static readonly 주소 = '/my/orders/:n';

  readonly 큰제목: Locator;
  readonly 주문상품제목: Locator;
  readonly 배송정보제목: Locator;
  readonly 결제정보제목: Locator;
  readonly 상태: Locator;
  readonly 주문취소버튼: Locator;
  readonly 상품표: Locator;
  readonly 상품링크들: Locator;
  readonly 안내제목: Locator;
  readonly 주문내역으로: Locator;
  readonly 취소모달: 모달;
  readonly 사유선택: Locator;
  readonly 사유입력: Locator;
  readonly 모달오류: Locator;
  readonly 모달닫기: Locator;
  readonly 취소신청: Locator;

  constructor(private readonly page: Page) {
    this.큰제목 = page.getByRole('heading', { level: 1, name: '주문 상세' });
    this.주문상품제목 = page.getByRole('heading', { level: 2, name: '주문 상품' });
    this.배송정보제목 = page.getByRole('heading', { level: 2, name: '배송 정보' });
    this.결제정보제목 = page.getByRole('heading', { level: 2, name: '결제 정보' });
    this.상태 = page.locator('dd .status');
    this.주문취소버튼 = page.getByRole('button', { name: '주문 취소', exact: true });
    this.상품표 = page.getByRole('table');
    this.상품링크들 = this.상품표.getByRole('link');
    this.주문내역으로 = page.getByRole('link', { name: '주문 내역으로', exact: true });
    this.안내제목 = page.locator('.empty-state').getByRole('heading', { level: 2 });
    this.취소모달 = new 모달(page, '주문 취소');
    this.사유선택 = this.취소모달.창.getByLabel('취소 사유');
    this.사유입력 = this.취소모달.창.getByLabel('사유 입력');
    this.모달오류 = this.취소모달.창.getByRole('alert');
    this.모달닫기 = this.취소모달.버튼('닫기');
    this.취소신청 = this.취소모달.버튼('취소 신청');
  }

  async 열기(주문번호: string): Promise<void> {
    await this.page.goto(`/my/orders/${encodeURIComponent(주문번호)}`);
    await this.그려질때까지();
  }

  async 그려질때까지(): Promise<void> {
    await this.주문상품제목.or(this.주문내역으로).waitFor();
  }

  async 취소모달열기(): Promise<void> {
    await this.주문취소버튼.click();
    await this.취소모달.뜰때까지();
  }

  async 사유고르기(사유: string): Promise<void> {
    await this.사유선택.selectOption(사유);
  }

  async 사유적기(글: string): Promise<void> {
    await this.사유입력.fill(글);
  }

  async 취소신청누르기(): Promise<void> {
    await this.취소신청.click();
  }
}
