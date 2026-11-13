import type { Locator, Page } from '@playwright/test';

import { 창 } from '../components/modal.component.js';
import { 운영틀 } from '../components/ops-shell.component.js';
import { 토스트 } from '../components/toast.component.js';

export class 공지화면 {
  static readonly 주소 = '/notices';

  readonly 틀: 운영틀;
  readonly 알림: 토스트;
  readonly 창: 창;
  readonly 제목: Locator;
  readonly 준비표시: Locator;
  readonly 안내: Locator;
  readonly 새공지버튼: Locator;
  readonly 표: Locator;
  readonly 표머리들: Locator;
  readonly 비었음: Locator;
  readonly 제목칸: Locator;
  readonly 내용칸: Locator;
  readonly 시작칸: Locator;
  readonly 끝칸: Locator;
  readonly 켜기체크: Locator;
  readonly 줄들: Locator;
  readonly 제목들: Locator;

  constructor(private readonly page: Page) {
    this.틀 = new 운영틀(page);
    this.알림 = new 토스트(page);
    this.창 = new 창(page);
    this.제목 = this.틀.본문.getByRole('heading', { level: 1, name: '공지', exact: true });
    this.준비표시 = page.locator('#nt-table').locator('table, .empty-state').first();
    this.안내 = this.틀.본문.getByText('켜져 있고 기간 안인 공지만 게임 로그인 화면 · 접속 중 알림에 나갑니다.', { exact: true });
    this.새공지버튼 = this.틀.본문.getByRole('button', { name: '새 공지', exact: true });
    this.표 = this.틀.본문.getByRole('table');
    this.표머리들 = this.표.getByRole('columnheader').filter({ hasText: /\S/ });
    this.비었음 = this.틀.본문.getByText('공지가 없습니다', { exact: true });
    this.제목칸 = this.창.칸('제목 (1~60자)');
    this.내용칸 = this.창.칸('내용 (1~1,000자)');
    this.시작칸 = this.창.칸('보이기 시작 (비우면 지금)');
    this.끝칸 = this.창.칸('보이기 끝 (비우면 끌 때까지)');
    this.켜기체크 = this.창.상자.getByLabel('켜기', { exact: true });
    this.줄들 = this.표.getByRole('row').filter({ has: page.getByRole('cell') });
    this.제목들 = this.표.locator('tbody td:nth-child(2)');
  }

  async 열기(뒤?: string): Promise<void> {
    await this.page.goto(뒤 === undefined ? 공지화면.주소 : `${공지화면.주소}${뒤}`);
    await this.그려질때까지();
  }

  async 그려질때까지(): Promise<void> {
    await this.제목.waitFor();
    await this.준비표시.waitFor();
  }

  줄(제목: string): Locator {
    return this.표.getByRole('row').filter({ has: this.page.getByRole('cell', { name: 제목, exact: true }) });
  }

  칸(제목: string, 열: '번호' | '기간' | '상태' | '고친 시각'): Locator {
    const 자리 = { 번호: 1, 기간: 3, 상태: 4, '고친 시각': 6 }[열];
    return this.줄(제목).locator(`td:nth-child(${String(자리)})`);
  }

  켜기스위치(제목: string): Locator {
    return this.줄(제목).getByRole('checkbox', { name: `${제목} 켜기`, exact: true });
  }

  고치기버튼(제목: string): Locator {
    return this.줄(제목).getByRole('button', { name: '고치기', exact: true });
  }

  지우기버튼(제목: string): Locator {
    return this.줄(제목).getByRole('button', { name: '지우기', exact: true });
  }

  async 새공지열기(): Promise<boolean> {
    await this.알림.모두.first().waitFor({ state: 'hidden', timeout: 10_000 });
    await this.새공지버튼.click();
    return this.창.열릴때까지();
  }

  async 적기(내용: { 제목?: string; 내용?: string; 시작?: string; 끝?: string }): Promise<void> {
    if (내용.제목 !== undefined) await this.제목칸.fill(내용.제목);
    if (내용.내용 !== undefined) await this.내용칸.fill(내용.내용);
    if (내용.시작 !== undefined) await this.시작칸.fill(내용.시작);
    if (내용.끝 !== undefined) await this.끝칸.fill(내용.끝);
  }

  async 저장누르기(): Promise<void> {
    await this.창.누르기('저장');
  }

  async 지우기확인(제목: string): Promise<void> {
    await this.지우기버튼(제목).click();
    await this.창.열릴때까지();
    await this.창.누르기('지우기');
  }

  async 저장두번누르기(): Promise<void> {
    await this.창.버튼('저장').dblclick();
  }

  async 화면이다시그려질때까지(): Promise<void> {
    await this.page.evaluate(() => new Promise<void>((끝) => requestAnimationFrame(() => requestAnimationFrame(() => 끝()))));
  }
}
