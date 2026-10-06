import type { Locator, Page } from '@playwright/test';

export class 상품목록화면 {
  readonly 카드: Locator;
  readonly 빈카드: Locator;
  readonly 품절카드: Locator;
  readonly 총개수: Locator;
  readonly 마지막안내: Locator;
  readonly 빈상태안내: Locator;
  readonly 가격슬라이더: Locator;
  readonly 가격표시: Locator;
  readonly 품절제외스위치: Locator;
  readonly 정렬상자: Locator;
  readonly 검색칸: Locator;
  readonly 자동완성목록: Locator;
  readonly 자동완성항목: Locator;
  readonly 제목: Locator;

  constructor(private readonly page: Page) {
    this.카드 = page.getByLabel('상품 목록', { exact: true }).getByRole('link');
    this.빈카드 = page.locator('.product-skel');
    this.품절카드 = page.locator('a.product.soldout');
    this.총개수 = page.getByText(/^총 \d+개$/);
    this.마지막안내 = page.getByText('마지막 상품입니다', { exact: true });
    this.빈상태안내 = page.getByText('조건에 맞는 상품이 없습니다', { exact: true });
    this.가격슬라이더 = page.getByRole('slider', { name: '최대 가격' });
    this.가격표시 = page.getByRole('status').filter({ hasText: '~' });
    this.품절제외스위치 = page.getByRole('checkbox', { name: '품절 상품 제외', exact: true });
    this.정렬상자 = page.getByRole('combobox', { name: '정렬', exact: true });
    this.검색칸 = page.getByRole('combobox', { name: '상품 검색', exact: true });
    this.자동완성목록 = page.getByRole('listbox', { name: '자동완성' });
    this.자동완성항목 = this.자동완성목록.getByRole('option');
    this.제목 = page.getByRole('heading', { name: '쇼핑', exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto('/shop');
  }

  async 첫화면기다리기(): Promise<void> {
    await this.카드.first().waitFor();
  }

  카테고리(이름: string): Locator {
    return this.page.getByRole('checkbox', { name: 이름, exact: true });
  }

  async 한번내리기(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  }

  async 끝까지내리기(): Promise<void> {
    for (let 번 = 0; 번 < 8; 번 += 1) {
      if (await this.마지막안내.isVisible()) return;
      if (await this.빈상태안내.isVisible()) return;
      const 전 = await this.카드.count();
      await this.한번내리기();
      await this.page.waitForFunction(
        (개수) => document.querySelectorAll('a.product').length > 개수 || !document.querySelector('.list-end')?.hasAttribute('hidden'),
        전,
      );
    }
    await this.마지막안내.waitFor();
  }

  async 다시불러오기끝기다리기(): Promise<void> {
    await this.빈카드.first().waitFor({ state: 'detached' });
  }

  async 가격옮기기(값: number): Promise<void> {
    await this.가격슬라이더.fill(String(값));
  }

  async 가격값직접넣기(값: number): Promise<void> {
    await this.가격슬라이더.evaluate((칸, 글) => {
      const 슬라이더 = 칸 as HTMLInputElement;
      슬라이더.value = 글;
      슬라이더.dispatchEvent(new Event('input', { bubbles: true }));
      슬라이더.dispatchEvent(new Event('change', { bubbles: true }));
    }, String(값));
  }

  async 첫줄카드수(): Promise<number> {
    return this.카드.evaluateAll((카드들) => {
      const 위 = 카드들[0]?.getBoundingClientRect().top ?? 0;
      return 카드들.filter((카드) => Math.abs(카드.getBoundingClientRect().top - 위) < 2).length;
    });
  }

  async 카드이름들(): Promise<string[]> {
    return this.카드.locator('.name').allInnerTexts();
  }

  async 카드가격들(): Promise<number[]> {
    const 글들 = await this.카드.locator('.sale').allInnerTexts();
    return 글들.map((글) => Number(글.replace(/\D/g, '')));
  }

  async 카드리뷰수들(): Promise<number[]> {
    const 글들 = await this.카드.locator('.stars').allInnerTexts();
    return 글들.map((글) => Number(/\((\d+)\)/.exec(글)?.[1] ?? Number.NaN));
  }

  할인카드(): Locator {
    return this.카드.filter({ has: this.page.locator('.rate') }).first();
  }

  async 카드조각이모두보이나(카드: Locator): Promise<boolean> {
    const 조각들 = [카드.getByRole('img'), 카드.locator('.name'), 카드.locator('.sale'), 카드.locator('.rate'), 카드.locator('.stars')];
    const 보임 = await Promise.all(조각들.map((조각) => 조각.isVisible()));
    return 보임.every(Boolean);
  }

  async 원래가격에가운데줄이있나(카드: Locator): Promise<boolean> {
    return 카드.locator('.origin').evaluate((글) => getComputedStyle(글).textDecorationLine.includes('line-through'));
  }

  async 할인가격이빨간가(카드: Locator): Promise<boolean> {
    return 카드.locator('.sale').evaluate((글) => {
      const [빨강, 초록, 파랑] = (getComputedStyle(글).color.match(/\d+/g) ?? []).map(Number);
      return (빨강 ?? 0) > 150 && (초록 ?? 255) < 80 && (파랑 ?? 255) < 80;
    });
  }

  async 품절덮개가회색이고품절표시가있나(카드: Locator): Promise<boolean> {
    const 보임 = await 카드.isVisible();
    const 덮개 = await 카드.evaluate((요소) => {
      const 겉 = getComputedStyle(요소, '::after');
      const 색 = (겉.backgroundColor.match(/[\d.]+/g) ?? []).map(Number);
      const 차이 = Math.max(...색.slice(0, 3)) - Math.min(...색.slice(0, 3));
      return { 내용: 겉.content, 회색: 색.length >= 3 && 차이 < 40 && (색[3] ?? 1) > 0 };
    });
    return 보임 && 덮개.내용 === '"품절"' && 덮개.회색;
  }

  async 고른정렬(): Promise<string> {
    return this.정렬상자.evaluate((상자) => (상자 as HTMLSelectElement).selectedOptions[0]?.textContent ?? '');
  }

  async 정렬목록(): Promise<string[]> {
    return this.정렬상자.getByRole('option').allInnerTexts();
  }

  async 자동완성이검색칸아래에있나(): Promise<boolean> {
    const 칸 = await this.검색칸.boundingBox();
    const 목록 = await this.자동완성목록.boundingBox();
    if (!칸 || !목록) return false;
    return 목록.y >= 칸.y + 칸.height - 1;
  }

  async 자동완성이름들(): Promise<string[]> {
    return this.자동완성항목.allInnerTexts();
  }

  async 한글자씩적기(글: string): Promise<void> {
    await this.검색칸.pressSequentially(글);
  }
}
