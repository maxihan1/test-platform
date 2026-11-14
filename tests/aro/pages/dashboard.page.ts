import type { Locator, Page } from '@playwright/test';

import { 창 } from '../components/modal.component.js';
import { 운영틀 } from '../components/ops-shell.component.js';
import type { 메뉴이름 } from '../components/ops-shell.component.js';
import { 토스트 } from '../components/toast.component.js';

export class 대시보드화면 {
  static readonly 주소 = '/';

  readonly 틀: 운영틀;
  readonly 알림: 토스트;
  readonly 창: 창;
  readonly 제목: Locator;
  readonly 준비표시: Locator;
  readonly 카드이름들: Locator;
  readonly 안내: Locator;

  constructor(private readonly page: Page) {
    this.틀 = new 운영틀(page);
    this.알림 = new 토스트(page);
    this.창 = new 창(page);
    this.제목 = this.틀.본문.getByRole('heading', { level: 1, name: '대시보드', exact: true });
    this.준비표시 = this.틀.본문.locator('.ops-cards .card').first();
    this.카드이름들 = this.틀.본문.locator('.ops-cards .card .muted');
    this.안내 = this.틀.본문.getByText('시각은 이 브라우저 시간대로 보입니다. 게임 서버가 읽는 공지 · 점검 상태는 /api/serverstatus 와 같습니다.', { exact: true });
  }

  카드(이름: string): Locator {
    return this.틀.본문.getByRole('link').filter({ has: this.page.getByText(이름, { exact: true }) });
  }

  카드값(이름: string): Locator {
    return this.카드(이름).locator('strong');
  }

  카드칩(이름: string): Locator {
    return this.카드(이름).locator('.status');
  }

  async 열기(뒤?: string): Promise<void> {
    await this.page.goto(뒤 === undefined ? 대시보드화면.주소 : `${대시보드화면.주소}${뒤}`);
    await this.그려질때까지();
  }

  async 그려질때까지(): Promise<void> {
    await this.제목.waitFor();
    await this.준비표시.waitFor();
  }

  async 열렸나(): Promise<boolean> {
    await this.page.goto(대시보드화면.주소);
    return this.제목.waitFor({ timeout: 10_000 }).then(() => true, () => false);
  }

  async 숫자못불러온채열기(): Promise<void> {
    await this.page.goto(대시보드화면.주소);
    await this.틀.본문오류.waitFor();
  }

  async 탭제목(): Promise<string> {
    return this.page.title();
  }

  async 문서쿠키(): Promise<string> {
    return this.page.evaluate(() => document.cookie);
  }

  async 메뉴열고그려질때까지(이름: 메뉴이름): Promise<void> {
    await this.틀.메뉴링크(이름).click();
    await this.틀.현재메뉴.filter({ hasText: 이름 }).waitFor();
    await this.틀.그려질때까지();
  }
}
