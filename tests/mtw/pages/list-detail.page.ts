import type { Locator, Page } from '@playwright/test';

import { 알림막대 } from '../components/toast.component.js';

export class 리스트상세화면 {
  static readonly 주소 = '/lists/{번호}';

  readonly 제목: Locator;
  readonly 설정보이기: Locator;
  readonly 리스트삭제: Locator;
  readonly 확인창: Locator;
  readonly 확인창제목: Locator;
  readonly 확인창취소: Locator;
  readonly 글목록: Locator;
  readonly 본문: Locator;
  readonly 알림: 알림막대;
  readonly 글들: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { level: 1 });
    this.설정보이기 = page.getByRole('main').getByRole('button', { name: '설정 보이기' });
    this.리스트삭제 = page.getByRole('main').getByRole('button', { name: '리스트 삭제' });
    this.확인창 = page.getByRole('dialog');
    this.확인창제목 = this.확인창.getByRole('heading', { level: 1 });
    this.확인창취소 = this.확인창.getByRole('button', { name: '취소' });
    this.글목록 = page.getByRole('main').getByRole('feed');
    this.본문 = page.getByRole('main');
    this.알림 = new 알림막대(page);
    this.글들 = page.getByRole('main').getByRole('article');
  }

  async 열기(경로: string): Promise<void> {
    await this.page.goto(경로);
    await this.제목.waitFor();
  }

  async 삭제창열기(): Promise<void> {
    await this.설정보이기.click();
    await this.리스트삭제.click();
    await this.확인창제목.waitFor();
  }
}
