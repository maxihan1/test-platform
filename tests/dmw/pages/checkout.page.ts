import type { Locator, Page } from '@playwright/test';

import { 주소검색창화면 } from './address-popup.page.js';

export interface 배송정보 {
  받는분: string;
  연락처: string;
  상세주소: string;
  희망일: string;
  요청사항?: string;
  직접입력?: string;
  주소안채움?: boolean;
}

export class 주문서화면 {
  static readonly 주소 = '/checkout';

  readonly 제목: Locator;
  readonly 단계표: Locator;
  readonly 현재단계: Locator;
  readonly 받는분: Locator;
  readonly 연락처: Locator;
  readonly 우편번호: Locator;
  readonly 주소칸: Locator;
  readonly 상세주소: Locator;
  readonly 배송요청: Locator;
  readonly 직접입력칸: Locator;
  readonly 희망일: Locator;
  readonly 주소검색버튼: Locator;
  readonly 다음: Locator;
  readonly 이전: Locator;
  readonly 비었음안내: Locator;
  readonly 결제수단그룹: Locator;
  readonly 카드사: Locator;
  readonly 할부: Locator;
  readonly 쿠폰: Locator;
  readonly 결제금액미리보기: Locator;
  readonly 최종확인: Locator;
  readonly 동의: Locator;
  readonly 결제하기: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { level: 1, name: '주문서', exact: true });
    this.단계표 = page.getByRole('list', { name: '주문 단계' });
    this.현재단계 = this.단계표.locator('[aria-current="step"]');
    this.받는분 = page.getByRole('textbox', { name: /^받는 분/ });
    this.연락처 = page.getByRole('textbox', { name: /^연락처/ });
    this.우편번호 = page.getByRole('textbox', { name: /^우편번호/ });
    this.주소칸 = page.getByRole('textbox', { name: /^주소/ });
    this.상세주소 = page.getByRole('textbox', { name: /^상세 주소/ });
    this.배송요청 = page.getByLabel('배송 요청 사항', { exact: true });
    this.직접입력칸 = page.getByLabel('요청 사항 직접 입력', { exact: true });
    this.희망일 = page.getByRole('textbox', { name: /^배송 희망일/ });
    this.주소검색버튼 = page.getByRole('button', { name: '주소 검색', exact: true });
    this.다음 = page.getByRole('button', { name: '다음', exact: true });
    this.이전 = page.getByRole('button', { name: '이전', exact: true });
    this.비었음안내 = page.getByText('주문할 상품이 없습니다', { exact: true }).filter({ visible: true });
    this.결제수단그룹 = page.getByRole('group', { name: /^결제 수단/ });
    this.카드사 = page.getByLabel('카드사', { exact: true });
    this.할부 = page.getByLabel('할부', { exact: true });
    this.쿠폰 = page.getByLabel('쿠폰', { exact: true });
    this.결제금액미리보기 = page.getByText(/^결제 금액 [\d,]+원$/);
    this.최종확인 = page.getByRole('heading', { level: 2, name: '최종 확인', exact: true });
    this.동의 = page.getByRole('checkbox', { name: '주문 내용을 확인했으며 결제에 동의합니다', exact: true });
    this.결제하기 = page.getByRole('button', { name: /원 결제하기$/ });
  }

  async 이동(줄번호들: number[]): Promise<void> {
    await this.page.goto(`${주문서화면.주소}?items=${줄번호들.join(',')}`);
  }

  async 열기(줄번호들: number[]): Promise<void> {
    await this.이동(줄번호들);
    await this.다그려질때까지();
  }

  async 다그려질때까지(): Promise<void> {
    await this.쿠폰.getByRole('option', { includeHidden: true }).nth(1).waitFor({ state: 'attached' });
  }

  async 비었음안내까지(): Promise<void> {
    await this.비었음안내.waitFor();
  }

  async 단계글(): Promise<string> {
    return this.현재단계.innerText();
  }

  단계항목(글: string): Locator {
    return this.단계표.getByText(글, { exact: true });
  }

  안내(글: string): Locator {
    return this.page.getByText(글, { exact: true });
  }

  async 주소검색창열기(): Promise<Page> {
    const [창] = await Promise.all([this.page.context().waitForEvent('page'), this.주소검색버튼.click()]);
    await 창.waitForLoadState('domcontentloaded');
    return 창;
  }

  async 주소가채워질때까지(): Promise<void> {
    const 칸 = await this.주소칸.elementHandle();
    if (칸 === null) throw new Error('주소 칸을 찾지 못했다');
    await this.page.waitForFunction((요소) => (요소 as HTMLInputElement).value !== '', 칸);
  }

  async 주소채우기(검색어: string): Promise<void> {
    const 팝업 = new 주소검색창화면(await this.주소검색창열기());
    await 팝업.다그려질때까지();
    await 팝업.검색(검색어);
    await 팝업.결과나올때까지();
    await 팝업.결과고르기();
    await this.주소가채워질때까지();
  }

  async 배송정보채우기(정보: 배송정보, 주소검색어 = '테헤란'): Promise<void> {
    await this.받는분.fill(정보.받는분);
    await this.연락처.fill(정보.연락처);
    if (정보.주소안채움 !== true) await this.주소채우기(주소검색어);
    await this.상세주소.fill(정보.상세주소);
    if (정보.요청사항 !== undefined) await this.배송요청.selectOption({ label: 정보.요청사항 });
    if (정보.직접입력 !== undefined) await this.직접입력칸.fill(정보.직접입력);
    await this.희망일.fill(정보.희망일);
  }

  async 배송정보없이다음(): Promise<void> {
    await this.다음.click();
  }

  결제수단라디오(이름: string): Locator {
    return this.결제수단그룹.getByRole('radio', { name: 이름, exact: true });
  }

  async 결제금액미리보기숫자(): Promise<number> {
    return Number((await this.결제금액미리보기.innerText()).replace(/\D/g, ''));
  }

  async 결제수단고르기(이름: string): Promise<void> {
    await this.결제수단그룹.getByRole('radio', { name: 이름, exact: true }).check();
  }

  async 할부선택지가막혔는가(이름: string): Promise<boolean> {
    return this.할부.getByRole('option', { name: 이름, exact: true }).evaluate((옵션) => (옵션 as HTMLOptionElement).disabled);
  }

  async 쿠폰선택지가막혔는가(이름: string): Promise<boolean> {
    return this.쿠폰.getByRole('option', { name: 이름, exact: true }).evaluate((옵션) => (옵션 as HTMLOptionElement).disabled);
  }

  async 쿠폰선택지글들(): Promise<string[]> {
    return this.쿠폰.getByRole('option').allInnerTexts();
  }

  async 쿠폰고르기(이름: string): Promise<void> {
    await this.쿠폰.selectOption({ label: 이름 });
  }

  async 선택지들(칸: Locator): Promise<string[]> {
    return 칸.getByRole('option').allInnerTexts();
  }

  async 쿠폰고르고금액이바뀔때까지(이름: string, 금액글: string): Promise<void> {
    await this.쿠폰고르기(이름);
    await this.page.getByText(금액글, { exact: true }).waitFor();
  }

  async 결제수단으로넘어가기(정보: 배송정보): Promise<void> {
    await this.배송정보채우기(정보);
    await this.다음.click();
    await this.결제수단그룹.waitFor();
  }

  async 최종확인으로넘어가기(결제수단: string): Promise<void> {
    await this.결제수단고르기(결제수단);
    await this.다음.click();
    await this.최종확인.waitFor();
  }

  async 희망일범위(): Promise<string> {
    const 작은 = (await this.희망일.getAttribute('min')) ?? '';
    const 큰 = (await this.희망일.getAttribute('max')) ?? '';
    return `${작은} ~ ${큰}`;
  }

  async 주소칸고칠수있는가(): Promise<boolean> {
    return this.주소칸.isEditable();
  }

  async 우편번호값(): Promise<string> {
    return this.우편번호.inputValue();
  }

  async 주소값(): Promise<string> {
    return this.주소칸.inputValue();
  }

  항목금액(항목: string): Locator {
    return this.page.locator(`dt:text-is("${항목}") + dd`);
  }

  async 항목금액읽기(항목: string): Promise<number> {
    return Number((await this.항목금액(항목).innerText()).replace(/\D/g, ''));
  }

  async 최종확인글(): Promise<string> {
    return this.page.locator('.review').innerText();
  }

  블록(제목: string): Locator {
    return this.page.getByRole('heading', { level: 2, name: 제목, exact: true });
  }

  async 결제하기글(): Promise<string> {
    return this.결제하기.innerText();
  }
}
