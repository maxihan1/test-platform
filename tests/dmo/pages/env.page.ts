import type { Locator, Page } from '@playwright/test';

import { 운영틀 } from '../components/ops-frame.component.js';

export class 환경화면 {
  static readonly 주소 = '/ops/env';
  readonly 제목: Locator;
  readonly 불안정모드: Locator;
  readonly 홈공지팝업: Locator;
  readonly 초기화: Locator;
  readonly 확인창: Locator;
  readonly 확인창닫기: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '환경', level: 1 });
    this.불안정모드 = page.getByRole('switch', { name: '응답 지연 · 리뷰 간헐 실패 · 무작위 시점' });
    this.홈공지팝업 = page.getByRole('switch', { name: '홈에 들어오면 공지 팝업을 띄운다' });
    this.초기화 = page.getByRole('button', { name: '데이터 초기화', exact: true });
    this.확인창 = page.getByRole('dialog');
    this.확인창닫기 = this.확인창.getByRole('button', { name: '닫기', exact: true }).filter({ hasText: '닫기' });
  }

  배너(제목: string): Locator {
    return this.page.getByRole('switch', { name: 제목, exact: true });
  }

  async 그려질때까지(): Promise<void> {
    await this.제목.waitFor();
    await this.초기화.waitFor();
    await this.홈공지팝업.waitFor();
    await new 운영틀(this.page).다그려질때까지();
  }

  async 열기(): Promise<void> {
    await this.page.goto(환경화면.주소);
    await this.그려질때까지();
  }

  async 확인창닫힘기다리기(): Promise<void> {
    await this.확인창.waitFor({ state: 'detached' });
  }
}
