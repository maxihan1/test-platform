import type { Locator, Page } from '@playwright/test';
import { 머리글 } from '../components/header.component.js';

export class 주문상세화면 {
  static readonly 주소 = '/my/orders/:id';
  readonly 제목: Locator;
  readonly 주문번호값: Locator;
  readonly 상태값: Locator;
  readonly 취소버튼: Locator;
  readonly 상품제목: Locator;
  readonly 배송제목: Locator;
  readonly 결제제목: Locator;
  readonly 상품표: Locator;
  readonly 상품링크들: Locator;
  readonly 권한없음제목: Locator;
  readonly 주문없음제목: Locator;
  readonly 창: Locator;
  readonly 사유선택: Locator;
  readonly 사유입력: Locator;
  readonly 창오류: Locator;
  readonly 신청버튼: Locator;
  readonly 창닫기버튼: Locator;
  readonly 머리글: 머리글;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '주문 상세', level: 1 });
    this.주문번호값 = page.getByRole('definition').filter({ hasText: /^DM\d{8}-\d{4}$/ });
    this.상태값 = page.getByText(/^(결제완료|배송중|배송완료|주문취소)$/);
    this.취소버튼 = page.getByRole('button', { name: '주문 취소', exact: true });
    this.상품제목 = page.getByRole('heading', { name: '주문 상품', level: 2 });
    this.배송제목 = page.getByRole('heading', { name: '배송 정보', level: 2 });
    this.결제제목 = page.getByRole('heading', { name: '결제 정보', level: 2 });
    this.상품표 = page.getByRole('table');
    this.상품링크들 = this.상품표.getByRole('link');
    this.권한없음제목 = page.getByRole('heading', { name: '권한이 없습니다', level: 2 });
    this.주문없음제목 = page.getByRole('heading', { name: '주문을 찾을 수 없습니다', level: 2 });
    this.창 = page.getByRole('dialog', { name: '주문 취소' });
    this.사유선택 = this.창.getByLabel('취소 사유');
    this.사유입력 = this.창.getByLabel('사유 입력');
    this.창오류 = this.창.getByRole('alert');
    this.신청버튼 = this.창.getByRole('button', { name: '취소 신청', exact: true });
    this.창닫기버튼 = this.창.getByRole('button', { name: '닫기', exact: true }).filter({ hasText: '닫기' });
    this.머리글 = new 머리글(page);
  }

  async 열기(주문번호: string): Promise<void> {
    await this.page.goto(`/my/orders/${encodeURIComponent(주문번호)}`);
    await this.제목.waitFor();
    await this.머리글.그려질때까지();
    await this.주문번호값.or(this.권한없음제목).or(this.주문없음제목).waitFor();
  }

  async 취소모달열기(): Promise<void> {
    await this.취소버튼.click();
    await this.창.waitFor();
  }

  async 사유고르기(사유: string): Promise<void> {
    await this.사유선택.selectOption({ label: 사유 });
  }

  async 사유쓰기(글: string): Promise<void> {
    await this.사유입력.fill(글);
  }

  async 취소신청누르기(): Promise<void> {
    await this.신청버튼.click();
  }

  async 사유목록(): Promise<string[]> {
    return this.사유선택.getByRole('option').allInnerTexts();
  }

  async 주문번호글자(): Promise<string> {
    return (await this.주문번호값.first().innerText()).trim();
  }

  async 상태글자(): Promise<string> {
    return (await this.상태값.first().innerText()).trim();
  }
}
