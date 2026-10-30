import type { ElementHandle, Locator, Page } from '@playwright/test';

import { 운영틀 } from '../components/ops-frame.component.js';
import { 토스트 } from '../components/toast.component.js';

export type 주문칩 = '전체' | '결제완료' | '배송중' | '배송완료' | '주문취소';

export class 주문관리화면 {
  static readonly 주소 = '/ops/orders';
  readonly 틀: 운영틀;
  readonly 토스트: 토스트;
  readonly 제목: Locator;
  readonly 검색칸: Locator;
  readonly 표: Locator;
  readonly 빈안내: Locator;
  readonly 열머리글: Locator;
  readonly 주문번호들: Locator;
  readonly 안내문구: Locator;

  constructor(readonly page: Page) {
    this.틀 = new 운영틀(page);
    this.토스트 = new 토스트(page);
    this.제목 = page.getByRole('heading', { name: '주문 관리', level: 1 });
    this.검색칸 = page.getByRole('searchbox', { name: '검색' });
    this.표 = page.getByRole('table');
    this.빈안내 = page.getByText('조건에 맞는 주문이 없습니다');
    this.열머리글 = this.표.getByRole('columnheader');
    this.주문번호들 = this.표.getByRole('cell', { name: /^DM\d{8}-\d+$/ });
    this.안내문구 = page.getByText('상태는 앞으로만 바뀝니다');
  }

  async 열기(): Promise<void> {
    await this.page.goto(주문관리화면.주소);
    await this.틀.다그려질때까지();
    await this.표.or(this.빈안내).waitFor();
  }

  async 다시그려질때까지(옛표: ElementHandle | null): Promise<void> {
    await 옛표?.waitForElementState('hidden');
  }

  async 옛표잡기(): Promise<ElementHandle | null> {
    return this.표.or(this.빈안내).elementHandle();
  }

  칩(상태: 주문칩): Locator {
    return this.page.getByRole('button', { name: new RegExp(`^${상태} \\d+$`) });
  }

  async 칩건수(상태: 주문칩): Promise<number> {
    const 글 = await this.칩(상태).innerText();
    return Number(글.replace(/\D+/g, ''));
  }

  async 칩누르기(상태: 주문칩): Promise<void> {
    const 옛 = await this.옛표잡기();
    await this.칩(상태).click();
    await this.다시그려질때까지(옛);
  }

  async 검색(글: string): Promise<void> {
    const 옛 = await this.옛표잡기();
    await this.검색칸.fill(글);
    await this.다시그려질때까지(옛);
  }

  주문줄(주문번호: string): Locator {
    return this.page.getByRole('row').filter({ has: this.page.getByRole('cell', { name: 주문번호, exact: true }) });
  }

  상태드롭다운(주문번호: string): Locator {
    return this.page.getByRole('combobox', { name: `${주문번호} 상태`, exact: true });
  }

  상세버튼(주문번호: string): Locator {
    return this.주문줄(주문번호).getByRole('button', { name: '상세', exact: true });
  }

  async 선택지(주문번호: string): Promise<string[]> {
    return this.상태드롭다운(주문번호).getByRole('option').allTextContents();
  }

  async 상태글자(주문번호: string): Promise<string> {
    const 드롭다운 = this.상태드롭다운(주문번호);
    if ((await 드롭다운.count()) > 0) return 드롭다운.inputValue();
    const 칩 = this.주문줄(주문번호).getByText(/^(결제완료|배송중|배송완료|주문취소)$/);
    return (await 칩.innerText()).trim();
  }

  async 표의상태들(): Promise<string[]> {
    return this.표.locator('tbody tr').evaluateAll((줄들) =>
      줄들.map((줄) => (줄.querySelector('select')?.value ?? 줄.querySelector('.status')?.textContent ?? '').trim()),
    );
  }

  async 상태바꾸기(주문번호: string, 상태: string): Promise<string> {
    const 옛 = await this.옛표잡기();
    await this.상태드롭다운(주문번호).selectOption(상태);
    const 토스트글 = await this.토스트.목록.first().innerText();
    await this.다시그려질때까지(옛);
    return 토스트글;
  }

  async 취소고르기(주문번호: string): Promise<void> {
    await this.상태드롭다운(주문번호).selectOption('주문취소');
  }

  async 확인창떴나(): Promise<boolean> {
    return this.틀.확인창.waitFor({ timeout: 10_000 }).then(
      () => true,
      () => false,
    );
  }

  async 취소확정(): Promise<string> {
    await this.틀.확인창.waitFor();
    const 옛 = await this.옛표잡기();
    await this.틀.창버튼('주문 취소').click();
    const 토스트글 = await this.토스트.목록.first().innerText();
    await this.다시그려질때까지(옛);
    await this.틀.확인창.waitFor({ state: 'detached' });
    return 토스트글;
  }

  async 취소창닫기(): Promise<void> {
    const 옛 = await this.옛표잡기();
    await this.틀.확인창.getByRole('button', { name: '닫기', exact: true }).filter({ hasText: '닫기' }).click();
    await this.다시그려질때까지(옛);
  }

  async 상세열기(주문번호: string): Promise<void> {
    await this.상세버튼(주문번호).click();
    await this.틀.확인창.waitFor();
  }

  상세창글(글: string): Locator {
    return this.틀.확인창.getByText(글);
  }

  async 상세창확인누르기(): Promise<void> {
    await this.틀.창버튼('확인').click();
  }

  async 창닫혔나(): Promise<boolean> {
    return this.틀.확인창.waitFor({ state: 'detached', timeout: 10_000 }).then(
      () => true,
      () => false,
    );
  }
}
