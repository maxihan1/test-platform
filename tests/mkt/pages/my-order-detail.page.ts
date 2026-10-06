import type { Locator, Page } from '@playwright/test';

import { 모달 } from '../components/feedback.component.js';
import { 마이페이지메뉴 } from '../components/member-helpers.component.js';

export class 주문상세화면 {
  readonly 제목: Locator;
  readonly 메뉴: 마이페이지메뉴;
  readonly 모달: 모달;
  readonly 상품제목: Locator;
  readonly 배송제목: Locator;
  readonly 결제제목: Locator;
  readonly 상태항목: Locator;
  readonly 상태표시: Locator;
  readonly 주문취소버튼: Locator;
  readonly 권한없음제목: Locator;
  readonly 취소사유선택: Locator;
  readonly 사유입력칸: Locator;
  readonly 취소신청버튼: Locator;
  readonly 모달오류: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '주문 상세', level: 1 });
    this.메뉴 = new 마이페이지메뉴(page);
    this.모달 = new 모달(page);
    this.상품제목 = page.getByRole('heading', { name: '주문 상품', level: 2 });
    this.배송제목 = page.getByRole('heading', { name: '배송 정보', level: 2 });
    this.결제제목 = page.getByRole('heading', { name: '결제 정보', level: 2 });
    this.상태항목 = page.getByText('주문 상태', { exact: true });
    this.상태표시 = page.locator('dl .status');
    this.주문취소버튼 = page.getByRole('button', { name: '주문 취소', exact: true });
    this.권한없음제목 = page.getByRole('heading', { name: '권한이 없습니다', level: 2 });
    this.취소사유선택 = this.모달.창.getByLabel('취소 사유', { exact: true });
    this.사유입력칸 = this.모달.창.getByLabel('사유 입력', { exact: true });
    this.취소신청버튼 = this.모달.버튼('취소 신청');
    this.모달오류 = this.모달.창.getByRole('alert');
  }

  async 열기(주문번호: string): Promise<void> {
    await this.page.goto(`/my/orders/${encodeURIComponent(주문번호)}`);
    await this.제목.waitFor();
  }

  async 불러오기기다리기(): Promise<void> {
    await this.배송제목.waitFor();
  }

  async 항목값(항목: string): Promise<string> {
    return this.page
      .locator('dt')
      .filter({ hasText: new RegExp(`^${항목}$`) })
      .evaluate((dt) => dt.nextElementSibling?.textContent ?? '');
  }

  async 취소모달열기(): Promise<void> {
    await this.주문취소버튼.click();
    await this.모달.열림기다리기();
  }

  async 사유고르기(이름: string): Promise<void> {
    await this.취소사유선택.selectOption(이름);
  }

  async 사유옵션들(): Promise<string[]> {
    return this.취소사유선택.getByRole('option').allInnerTexts();
  }
}
