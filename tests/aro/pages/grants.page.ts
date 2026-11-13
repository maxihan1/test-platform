import type { Locator, Page } from '@playwright/test';

import { 창 } from '../components/modal.component.js';
import { 운영틀 } from '../components/ops-shell.component.js';
import { 토스트 } from '../components/toast.component.js';

export interface 폼내용 {
  캐릭터?: string;
  제목: string;
  사유: string;
  본문?: string;
  아이템?: { 이름: string; 수량: number }[];
  골드?: number;
}

export interface 지급요청본문 {
  characterIds: number[];
  subject: string;
  items: { itemName: string; quantity: number }[];
  currencyAmount: number;
}

export class 지급화면 {
  static readonly 주소 = '/grants';

  readonly 틀: 운영틀;
  readonly 알림: 토스트;
  readonly 창: 창;
  readonly 제목: Locator;
  readonly 준비표시: Locator;
  readonly 폼제목: Locator;
  readonly 폼: Locator;
  readonly 받는칸: Locator;
  readonly 후보상자: Locator;
  readonly 후보들: Locator;
  readonly 후보없음: Locator;
  readonly 고른것들: Locator;
  readonly 아이템이름칸들: Locator;
  readonly 수량칸들: Locator;
  readonly 줄더하기: Locator;
  readonly 줄빼기들: Locator;
  readonly 이름후보: Locator;
  readonly 골드칸: Locator;
  readonly 제목칸: Locator;
  readonly 사유칸: Locator;
  readonly 본문칸: Locator;
  readonly 안내: Locator;
  readonly 보내기버튼: Locator;
  readonly 이력표: Locator;
  readonly 열머리들: Locator;
  readonly 이력행들: Locator;
  readonly 빈이력안내: Locator;
  readonly 쪽표시: Locator;
  readonly 이전: Locator;
  readonly 다음: Locator;

  constructor(private readonly page: Page) {
    this.틀 = new 운영틀(page);
    this.알림 = new 토스트(page);
    this.창 = new 창(page);
    this.제목 = this.틀.본문.getByRole('heading', { level: 1, name: '지급 · 회수', exact: true });
    this.준비표시 = page.locator('#grant-page').filter({ hasText: /\S/ });
    this.폼제목 = this.틀.본문.getByRole('heading', { level: 2, name: '우편으로 보내기', exact: true });
    this.폼 = page.locator('#grant-form');
    this.받는칸 = page.getByLabel('받는 캐릭터 (1~50명)', { exact: true });
    this.후보상자 = page.locator('#grant-results');
    this.후보들 = this.후보상자.getByRole('button');
    this.후보없음 = this.후보상자.getByText('찾는 캐릭터가 없습니다', { exact: true });
    this.고른것들 = page.locator('#grant-picked').getByRole('button');
    this.아이템이름칸들 = page.getByLabel('아이템 이름', { exact: true });
    this.수량칸들 = page.getByLabel('수량', { exact: true });
    this.줄더하기 = page.getByRole('button', { name: '아이템 줄 더하기', exact: true });
    this.줄빼기들 = this.폼.getByRole('button', { name: '빼기', exact: true });
    this.이름후보 = page.locator('#grant-known option');
    this.골드칸 = page.getByLabel('골드', { exact: true });
    this.제목칸 = page.getByLabel('우편 제목 (1~50자)', { exact: true });
    this.사유칸 = page.getByLabel('지급 사유 (1~200자, 기록에만 남음)', { exact: true });
    this.본문칸 = page.getByLabel('우편 본문 (500자까지)', { exact: true });
    this.안내 = this.폼.getByText('보낸 우편은 받는 사람이 게임 우편함에서 첨부를 받습니다. 안 받은 첨부만 회수할 수 있습니다.', { exact: true });
    this.보내기버튼 = this.폼.getByRole('button', { name: '보내기', exact: true });
    this.이력표 = page.locator('#grant-table');
    this.열머리들 = this.이력표.getByRole('columnheader');
    this.이력행들 = this.이력표.getByRole('row').filter({ has: page.getByRole('cell') });
    this.빈이력안내 = this.이력표.getByText('아직 보낸 지급이 없습니다', { exact: true });
    this.쪽표시 = page.locator('#grant-page');
    this.이전 = page.getByRole('button', { name: '이전', exact: true });
    this.다음 = page.getByRole('button', { name: '다음', exact: true });
  }

  async 열기(뒤?: string): Promise<void> {
    await this.page.goto(뒤 === undefined ? 지급화면.주소 : `${지급화면.주소}${뒤}`);
    await this.그려질때까지();
  }

  async 그려질때까지(): Promise<void> {
    await this.제목.waitFor();
    await this.준비표시.waitFor();
  }

  async 틀만그려질때까지열기(뒤: string): Promise<void> {
    await this.page.goto(`${지급화면.주소}${뒤}`);
    await this.틀.그려질때까지();
  }

  현재주소(): string {
    const 주소 = new URL(this.page.url());
    return `${주소.pathname}${주소.search}`;
  }

  후보(이름: string): Locator {
    return this.후보들.filter({ hasText: new RegExp(`^${이름} #`) });
  }

  고른것(이름: string): Locator {
    return this.고른것들.filter({ hasText: new RegExp(`^${이름} #`) });
  }

  async 검색어적기(글: string): Promise<void> {
    await this.받는칸.fill(글);
  }

  async 후보뜰때까지(이름?: string): Promise<void> {
    await (이름 === undefined ? this.후보들.first() : this.후보(이름)).waitFor();
  }

  async 후보여부뜰때까지(): Promise<void> {
    await this.후보들.or(this.후보없음).first().waitFor();
  }

  async 캐릭터고르기(이름: string): Promise<void> {
    await this.검색어적기(이름);
    await this.후보뜰때까지(이름);
    await this.후보(이름).click();
    await this.고른것(이름).waitFor();
  }

  async 고른것빼기(이름: string): Promise<void> {
    await this.고른것(이름).click();
    await this.고른것(이름).waitFor({ state: 'detached' });
  }

  async 후보를번째까지누르기(개수: number): Promise<void> {
    for (let i = 0; i < 개수; i += 1) await this.후보들.nth(i).click();
  }

  async 후보번째누르기(번째: number): Promise<void> {
    await this.후보들.nth(번째).click();
  }

  async 아이템줄만들때까지(줄수: number): Promise<void> {
    for (let i = await this.아이템이름칸들.count(); i < 줄수; i += 1) {
      await this.줄더하기.click();
      await this.아이템이름칸들.nth(i).waitFor();
    }
  }

  async 아이템줄더하기누르기(): Promise<void> {
    await this.줄더하기.click();
  }

  async 아이템줄채우기(줄들: { 이름: string; 수량: number }[]): Promise<void> {
    await this.아이템줄만들때까지(줄들.length);
    for (let i = 0; i < 줄들.length; i += 1) {
      await this.아이템이름칸들.nth(i).fill(줄들[i]?.이름 ?? '');
      await this.수량칸들.nth(i).fill(String(줄들[i]?.수량 ?? 1));
    }
  }

  async 둘째줄빼기(): Promise<void> {
    await this.줄빼기들.nth(1).click();
    await this.아이템이름칸들.nth(1).waitFor({ state: 'detached' });
  }

  async 아이템이름값들(): Promise<string[]> {
    return this.아이템이름칸들.evaluateAll((칸들) => 칸들.map((칸) => (칸 as HTMLInputElement).value));
  }

  async 이름칸후보수(): Promise<number> {
    return this.아이템이름칸들.first().evaluate((칸) => (칸 as HTMLInputElement).list?.options.length ?? 0);
  }

  async 이름후보뜰때까지(): Promise<void> {
    await this.이름후보.first().waitFor({ state: 'attached' });
  }

  async 폼채우기(내용: 폼내용): Promise<void> {
    if (내용.캐릭터 !== undefined) await this.캐릭터고르기(내용.캐릭터);
    if (내용.아이템 !== undefined) await this.아이템줄채우기(내용.아이템);
    if (내용.골드 !== undefined) await this.골드칸.fill(String(내용.골드));
    await this.제목칸.fill(내용.제목);
    await this.사유칸.fill(내용.사유);
    if (내용.본문 !== undefined) await this.본문칸.fill(내용.본문);
  }

  async 본문적기(글: string): Promise<void> {
    await this.본문칸.fill(글);
  }

  async 보내기눌러확인창뜰때까지(): Promise<void> {
    await this.보내기버튼.click();
    await this.창.상자.waitFor();
  }

  async 확인창에서보내기(): Promise<void> {
    await this.창.누르기('보내기');
  }

  async 채워서보내기(내용: 폼내용): Promise<void> {
    await this.폼채우기(내용);
    await this.보내기눌러확인창뜰때까지();
    await this.확인창에서보내기();
  }

  async 확인창에서빠르게두번보내기(): Promise<void> {
    await this.창.버튼('보내기').dblclick();
  }

  지급요청본문기다리기(): Promise<지급요청본문> {
    return this.page
      .waitForRequest((요청) => 요청.method() === 'POST' && new URL(요청.url()).pathname === '/api/ops/grants')
      .then((요청) => 요청.postDataJSON() as 지급요청본문);
  }

  행(제목: string): Locator {
    return this.이력행들.filter({ has: this.page.getByRole('cell', { name: 제목, exact: true }) });
  }

  행번호(번호: number): Locator {
    return this.이력행들.filter({ has: this.page.getByRole('cell', { name: String(번호), exact: true }) });
  }

  첫줄번호칸(): Locator {
    return this.이력행들.first().getByRole('cell').first();
  }

  async 열칸(제목: string, 열이름: string): Promise<Locator> {
    const 이름들 = await this.열머리들.allInnerTexts();
    return this.행(제목).getByRole('cell').nth(이름들.indexOf(열이름));
  }

  칩(제목: string): Locator {
    return this.행(제목).locator('.status');
  }

  회수버튼(제목: string): Locator {
    return this.행(제목).getByRole('button', { name: '회수', exact: true });
  }

  번호행의회수버튼(번호: number): Locator {
    return this.행번호(번호).getByRole('button', { name: '회수', exact: true });
  }

  async 회수창열기(제목: string): Promise<void> {
    await this.회수버튼(제목).click();
    await this.창.상자.waitFor();
  }

  async 회수하기(제목: string, 사유: string): Promise<void> {
    await this.회수창열기(제목);
    await this.창.칸('회수 사유 (1~200자)').fill(사유);
    await this.창.누르기('회수');
  }

  async 쪽번호(): Promise<string> {
    return (await this.쪽표시.innerText()).trim();
  }

  async 다음쪽으로(): Promise<void> {
    const 지금 = Number((await this.쪽번호()).split(' / ')[0]);
    await this.다음.click();
    await this.쪽표시.filter({ hasText: new RegExp(`^${String(지금 + 1)} / `) }).waitFor();
  }

  async 이전쪽으로(): Promise<void> {
    const 지금 = Number((await this.쪽번호()).split(' / ')[0]);
    await this.이전.click();
    await this.쪽표시.filter({ hasText: new RegExp(`^${String(지금 - 1)} / `) }).waitFor();
  }

  async 행이보일때까지쪽넘기기(번호: number): Promise<boolean> {
    for (;;) {
      if ((await this.행번호(번호).count()) > 0) return true;
      if (await this.다음.isDisabled()) return false;
      await this.다음쪽으로();
    }
  }
}
