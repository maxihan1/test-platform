import type { Locator, Page } from '@playwright/test';

import { 알림 } from '../components/flash.component.js';
import { 해시태그목록화면 } from './tags.page.js';

export class 해시태그상세화면 {
  static readonly 주소 = '/admin/tags/';

  readonly 제목: Locator;
  readonly 알림: 알림;
  readonly 공개시점으로보기: Locator;
  readonly 표시이름칸: Locator;
  readonly 사용허용: Locator;
  readonly 유행허용: Locator;
  readonly 추천허용: Locator;
  readonly 저장: Locator;
  readonly 오류안내: Locator;
  private readonly 목록: 해시태그목록화면;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { level: 1 });
    this.알림 = new 알림(page);
    this.공개시점으로보기 = page.getByRole('link', { name: '공개시점으로 보기' });
    this.표시이름칸 = page.getByRole('textbox', { name: '표시되는 이름' });
    this.사용허용 = page.getByRole('checkbox', { name: '이 해시태그를 로컬 게시물에서 사용 가능하도록 허용' });
    this.유행허용 = page.getByRole('checkbox', { name: '이 해시태그가 유행에 나타날 수 있도록 허용' });
    this.추천허용 = page.getByRole('checkbox', { name: '이 해시태그가 검색과 추천에 보여지도록 허용' });
    this.저장 = page.getByRole('button', { name: '변경 사항을 저장' });
    this.오류안내 = page.getByText(/^오류가 발생했습니다/);
    this.목록 = new 해시태그목록화면(page);
  }

  타일(이름: string): Locator {
    return this.page.locator('.sparkline').getByText(이름, { exact: true });
  }

  async 열기(이름: string): Promise<void> {
    await this.목록.열기();
    await this.목록.행링크(이름).click();
    await this.저장.waitFor();
  }

  async 이름으로찾아열기(이름: string): Promise<void> {
    await this.목록.이름으로찾기(이름);
    await this.목록.행링크(이름).click();
    await this.저장.waitFor();
  }

  async 스크립트다불러올때까지(): Promise<void> {
    await this.page.waitForLoadState('load');
  }

  async 저장누르기(): Promise<void> {
    await this.저장.click();
  }

  async 표시이름바꿔저장하기(이름: string): Promise<void> {
    await this.표시이름칸.fill(이름);
    await this.저장.click();
  }
}
