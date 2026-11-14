import type { Locator, Page } from '@playwright/test';

import { 창 } from '../components/modal.component.js';
import { 운영틀 } from '../components/ops-shell.component.js';
import { 토스트 } from '../components/toast.component.js';

export class 기록화면 {
  static readonly 주소 = '/logs';

  readonly 틀: 운영틀;
  readonly 알림: 토스트;
  readonly 창: 창;
  readonly 제목: Locator;
  readonly 준비표시: Locator;
  readonly 종류: Locator;
  readonly 선택한종류: Locator;
  readonly 종류선택지들: Locator;
  readonly 검색칸: Locator;
  readonly 총건수: Locator;
  readonly 쪽표시: Locator;
  readonly 이전: Locator;
  readonly 다음: Locator;
  readonly 표: Locator;
  readonly 표머리들: Locator;
  readonly 줄들: Locator;
  readonly 비었음: Locator;
  readonly 안내: Locator;
  readonly 수정삭제버튼: Locator;

  constructor(private readonly page: Page) {
    this.틀 = new 운영틀(page);
    this.알림 = new 토스트(page);
    this.창 = new 창(page);
    this.제목 = this.틀.본문.getByRole('heading', { level: 1, name: '기록', exact: true });
    this.준비표시 = page.locator('#log-page').filter({ hasText: /\S/ });
    this.종류 = this.틀.본문.getByRole('combobox', { name: '종류', exact: true });
    this.선택한종류 = this.종류.getByRole('option', { selected: true });
    this.종류선택지들 = this.종류.getByRole('option');
    this.검색칸 = this.틀.본문.getByRole('searchbox', { name: '검색', exact: true });
    this.총건수 = this.틀.본문.getByText(/^총 [\d,]+건$/);
    this.쪽표시 = this.틀.본문.getByText(/^\d+ \/ \d+$/);
    this.이전 = this.틀.본문.getByRole('button', { name: '이전', exact: true });
    this.다음 = this.틀.본문.getByRole('button', { name: '다음', exact: true });
    this.표 = this.틀.본문.getByRole('table');
    this.표머리들 = this.표.getByRole('columnheader');
    this.줄들 = this.표.getByRole('row').filter({ has: page.getByRole('cell') });
    this.비었음 = this.틀.본문.getByText('기록이 없습니다', { exact: true });
    this.안내 = this.틀.본문.getByText('최근 것부터. 아이템 흐름은 운영툴이 보낸 우편의 지급 · 게임에서 받은 것 · 회수한 것입니다.', { exact: true });
    this.수정삭제버튼 = this.틀.본문.getByRole('button', { name: /수정|삭제/ });
  }

  async 열기(뒤?: string): Promise<void> {
    await this.page.goto(뒤 === undefined ? 기록화면.주소 : `${기록화면.주소}${뒤}`);
    await this.그려질때까지();
  }

  async 그려질때까지(): Promise<void> {
    await this.제목.waitFor();
    await this.준비표시.waitFor();
  }

  탭(이름: '운영자 작업' | '아이템 흐름'): Locator {
    return this.틀.본문.getByRole('tab', { name: 이름, exact: true });
  }

  선택한탭(이름: '운영자 작업' | '아이템 흐름'): Locator {
    return this.틀.본문.getByRole('tab', { name: 이름, exact: true, selected: true });
  }

  칸들(열: '시각' | '메뉴' | '작업' | '흐름' | '아이템 · 재화' | '지급 번호'): Locator {
    const 자리 = { 시각: 1, 메뉴: 3, 작업: 4, 흐름: 2, '아이템 · 재화': 4, '지급 번호': 7 }[열];
    return this.줄들.locator(`td:nth-child(${String(자리)})`);
  }

  지급번호줄(지급번호: number): Locator {
    return this.줄들.filter({ has: this.page.locator('td:nth-child(7)', { hasText: new RegExp(`^${String(지급번호)}$`) }) });
  }

  async 칸글(줄: Locator): Promise<string[]> {
    return 줄.getByRole('cell').allInnerTexts();
  }

  async 탭누르기(이름: '운영자 작업' | '아이템 흐름'): Promise<void> {
    await this.탭(이름).click();
    await this.선택한탭(이름).waitFor();
    await this.표.getByRole('columnheader', { name: 이름 === '아이템 흐름' ? '흐름' : '운영자', exact: true }).or(this.비었음).waitFor();
  }

  async 검색(글: string): Promise<void> {
    await this.검색칸.fill(글);
    await this.줄들.filter({ hasNotText: 글 }).first().waitFor({ state: 'detached' });
    await this.줄들.filter({ hasText: 글 }).first().or(this.비었음).waitFor();
  }

  async 종류고르기(이름: string): Promise<void> {
    await this.종류.selectOption({ label: 이름 });
    await this.선택한종류.filter({ hasText: 이름 }).waitFor({ state: 'attached' });
    await this.줄들.filter({ hasNotText: 이름 }).first().waitFor({ state: 'detached' });
    await this.줄들.first().or(this.비었음).waitFor();
  }

  async 다음쪽으로(): Promise<void> {
    const 앞 = (await this.쪽표시.innerText()).trim();
    await this.다음.click();
    await this.쪽표시.filter({ hasNotText: 앞 }).waitFor();
  }

  async 이전쪽으로(): Promise<void> {
    const 앞 = (await this.쪽표시.innerText()).trim();
    await this.이전.click();
    await this.쪽표시.filter({ hasNotText: 앞 }).waitFor();
  }

  작업별줄(작업: string): Locator {
    return this.줄들.filter({ has: this.page.getByRole('cell', { name: 작업, exact: true }) });
  }

  흐름줄(지급번호: number, 흐름: '지급' | '수령' | '회수'): Locator {
    return this.지급번호줄(지급번호).filter({ has: this.page.getByRole('cell', { name: 흐름, exact: true }) });
  }

  셀로찾은줄(...칸글들: string[]): Locator {
    return 칸글들.reduce((줄들, 글) => 줄들.filter({ has: this.page.getByRole('cell', { name: 글, exact: true }) }), this.줄들);
  }
}
