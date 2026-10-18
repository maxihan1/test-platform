import type { Locator, Page } from '@playwright/test';
import { 머리글 } from '../components/header.component.js';

export class 상품목록화면 {
  static readonly 주소 = '/shop';
  readonly 제목: Locator;
  readonly 필터: Locator;
  readonly 최대가격: Locator;
  readonly 가격표시: Locator;
  readonly 품절제외: Locator;
  readonly 검색칸: Locator;
  readonly 자동완성: Locator;
  readonly 자동완성항목: Locator;
  readonly 정렬: Locator;
  readonly 총개수: Locator;
  readonly 목록: Locator;
  readonly 카드들: Locator;
  readonly 품절카드들: Locator;
  readonly 빈카드: Locator;
  readonly 마지막문구: Locator;
  readonly 결과없음: Locator;
  readonly 머리글: 머리글;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '쇼핑', level: 1 });
    this.필터 = page.getByLabel('상품 필터');
    this.최대가격 = this.필터.getByRole('slider', { name: '최대 가격' });
    this.가격표시 = this.필터.getByRole('status');
    this.품절제외 = this.필터.getByRole('checkbox', { name: '품절 상품 제외' });
    this.검색칸 = page.getByRole('combobox', { name: '상품 검색' });
    this.자동완성 = page.getByRole('listbox', { name: '자동완성' });
    this.자동완성항목 = this.자동완성.getByRole('option');
    this.정렬 = page.getByRole('combobox', { name: '정렬' });
    this.총개수 = page.getByText(/^총 \d+개$/);
    this.목록 = page.getByLabel('상품 목록');
    this.카드들 = this.목록.getByRole('link');
    this.품절카드들 = this.목록.locator('a.soldout');
    this.빈카드 = this.목록.locator('.product-skel');
    this.마지막문구 = page.getByText('마지막 상품입니다');
    this.결과없음 = page.getByText('조건에 맞는 상품이 없습니다');
    this.머리글 = new 머리글(page);
  }

  카테고리(이름: string): Locator {
    return this.필터.getByRole('checkbox', { name: 이름, exact: true });
  }

  카드(상품번호: number): Locator {
    return this.목록.locator(`a[href="/shop/${상품번호}"]`);
  }

  카드이미지(카드: Locator): Locator {
    return 카드.getByRole('img');
  }

  카드상품명(카드: Locator): Locator {
    return 카드.locator('.name');
  }

  카드가격(카드: Locator): Locator {
    return 카드.locator('.price');
  }

  카드원가(카드: Locator): Locator {
    return 카드.locator('.origin');
  }

  카드판매가(카드: Locator): Locator {
    return 카드.locator('.sale');
  }

  카드할인율(카드: Locator): Locator {
    return 카드.locator('.rate');
  }

  카드별점(카드: Locator): Locator {
    return 카드.locator('.stars');
  }

  async 열기(): Promise<void> {
    await this.열기만();
    await this.카드들.first().waitFor();
  }

  async 열기만(): Promise<void> {
    await this.page.goto(상품목록화면.주소);
    await this.제목.waitFor();
    await this.머리글.그려질때까지();
  }

  async 목록다시나올때까지(): Promise<void> {
    await this.빈카드.first().waitFor({ state: 'detached' });
  }

  async 카드나올때까지(): Promise<void> {
    await this.카드들.first().waitFor();
  }

  async 끝으로내리기(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  }

  async 총개수읽기(): Promise<number> {
    return Number((await this.총개수.innerText()).replace(/\D/g, ''));
  }

  async 다불러올때까지내리기(): Promise<void> {
    const 총 = await this.총개수읽기();
    for (;;) {
      const 앞 = await this.카드들.count();
      if (앞 >= 총) return;
      await this.끝으로내리기();
      await this.카드들.nth(앞).waitFor();
    }
  }

  async 한줄에보이는카드수(): Promise<number> {
    return this.카드들.evaluateAll((카드) => {
      const 위 = 카드.map((요소) => Math.round(요소.getBoundingClientRect().top + window.scrollY));
      return 위.filter((값) => 값 === 위[0]).length;
    });
  }

  async 최대가격정하기(값: number): Promise<void> {
    await this.최대가격.fill(String(값));
  }

  async 최대가격범위밖값넣기(값: number): Promise<void> {
    await this.최대가격.evaluate((요소, 넣을값) => {
      const 칸 = 요소 as HTMLInputElement;
      칸.value = String(넣을값);
      칸.dispatchEvent(new Event('input', { bubbles: true }));
      칸.dispatchEvent(new Event('change', { bubbles: true }));
    }, 값);
  }

  async 검색어적기(글: string): Promise<void> {
    await this.검색칸.fill(글);
  }

  async 카드판매가들읽기(): Promise<number[]> {
    const 글들 = await this.카드들.locator('.sale').allInnerTexts();
    return 글들.map((글) => Number(글.replace(/\D/g, '')));
  }

  async 카드상품명들읽기(): Promise<string[]> {
    return this.카드들.locator('.name').allInnerTexts();
  }

  async 총개수가될때까지(수: number): Promise<void> {
    await this.page.getByText(`총 ${수}개`, { exact: true }).waitFor();
  }

  async 원가에줄이그어졌나(카드: Locator): Promise<boolean> {
    return this.카드원가(카드).evaluate((요소) => getComputedStyle(요소).textDecorationLine.includes('line-through'));
  }

  async 판매가가빨간가(카드: Locator): Promise<boolean> {
    const 색 = await this.카드판매가(카드).evaluate((요소) => getComputedStyle(요소).color);
    const [빨강 = 0, 초록 = 0, 파랑 = 0] = (색.match(/\d+(\.\d+)?/g) ?? []).map(Number);
    return 빨강 >= 150 && 초록 <= 100 && 파랑 <= 100;
  }

  async 품절덮개상태(카드: Locator): Promise<{ 글: string; 회색: boolean }> {
    return 카드.evaluate((요소) => {
      const 뒤 = getComputedStyle(요소, '::after');
      const [빨강 = 0, 초록 = 0, 파랑 = 0, 투명도 = 1] = (뒤.backgroundColor.match(/\d+(\.\d+)?/g) ?? []).map(Number);
      return { 글: 뒤.content.replace(/^"|"$/g, ''), 회색: 투명도 > 0 && Math.abs(빨강 - 초록) < 30 && Math.abs(초록 - 파랑) < 30 };
    });
  }

  async 정렬옵션들(): Promise<string[]> {
    return this.정렬.getByRole('option').allInnerTexts();
  }

  async 고른정렬(): Promise<string> {
    return this.정렬.evaluate((요소) => (요소 as HTMLSelectElement).selectedOptions[0]?.text ?? '');
  }
}
