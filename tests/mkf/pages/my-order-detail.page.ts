import type { Locator, Page } from '@playwright/test';

import { 모달 } from '../components/modal.component.js';

export class 내주문상세화면 {
  static readonly 주소 = '/my/orders/:id';

  readonly 제목: Locator;
  readonly 상품목록제목: Locator;
  readonly 배송정보제목: Locator;
  readonly 결제정보제목: Locator;
  readonly 주문상태이름: Locator;
  readonly 상태배지: Locator;
  readonly 주문취소: Locator;
  readonly 모달: 모달;
  readonly 취소사유: Locator;
  readonly 취소사유항목들: Locator;
  readonly 사유입력: Locator;
  readonly 취소신청: Locator;
  readonly 취소오류: Locator;
  readonly 권한없음: Locator;
  readonly 못찾음: Locator;
  readonly 주문내역으로: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '주문 상세', level: 1 });
    this.상품목록제목 = page.getByRole('heading', { name: '주문 상품', level: 2 });
    this.배송정보제목 = page.getByRole('heading', { name: '배송 정보', level: 2 });
    this.결제정보제목 = page.getByRole('heading', { name: '결제 정보', level: 2 });
    this.주문상태이름 = page.getByRole('term').filter({ hasText: '주문 상태' });
    this.상태배지 = page.locator('#detail span.status');
    this.주문취소 = page.getByRole('button', { name: '주문 취소', exact: true });
    this.모달 = new 모달(page);
    this.취소사유 = this.모달.창.getByLabel('취소 사유', { exact: true });
    this.취소사유항목들 = this.취소사유.getByRole('option');
    this.사유입력 = this.모달.창.getByLabel('사유 입력', { exact: true });
    this.취소신청 = this.모달.버튼('취소 신청');
    this.취소오류 = this.모달.창.getByRole('alert');
    this.권한없음 = page.getByRole('heading', { name: '권한이 없습니다', level: 2 });
    this.못찾음 = page.getByRole('heading', { name: '주문을 찾을 수 없습니다', level: 2 });
    this.주문내역으로 = page.getByRole('link', { name: '주문 내역으로' });
  }

  취소오류글(문구: string): Locator {
    return this.모달.창.getByText(문구, { exact: true });
  }

  주문번호표시(주문번호: string): Locator {
    return this.page.getByRole('definition').filter({ hasText: 주문번호 });
  }

  async 취소창열기(): Promise<void> {
    await this.주문취소.click();
    await this.모달.창.waitFor();
  }

  async 열기(주문번호: string): Promise<void> {
    await this.page.goto(`/my/orders/${encodeURIComponent(주문번호)}`);
    await this.제목.waitFor();
  }
}
