import type { Locator, Page } from '@playwright/test';

export class 상품목록 {
  constructor(private readonly page: Page) {}

  get 제목(): Locator {
    return this.page.getByRole('heading', { level: 1, name: '쇼핑' });
  }

  get 필터영역(): Locator {
    return this.page.getByRole('complementary', { name: '상품 필터' });
  }

  get 카테고리체크들(): Locator {
    return this.필터영역.getByRole('group', { name: '카테고리' }).getByRole('checkbox');
  }

  카테고리(이름: string): Locator {
    return this.필터영역.getByRole('checkbox', { name: 이름, exact: true });
  }

  get 가격슬라이더(): Locator {
    return this.page.getByRole('slider', { name: '최대 가격' });
  }

  get 가격표시(): Locator {
    return this.page.locator('.price-label');
  }

  get 품절제외(): Locator {
    return this.page.getByRole('checkbox', { name: '품절 상품 제외' });
  }

  get 검색칸(): Locator {
    return this.page.getByRole('combobox', { name: '상품 검색' });
  }

  get 자동완성목록(): Locator {
    return this.page.getByRole('listbox', { name: '자동완성' });
  }

  get 자동완성항목들(): Locator {
    return this.자동완성목록.getByRole('option');
  }

  자동완성항목(이름: string): Locator {
    return this.자동완성목록.getByRole('option', { name: 이름, exact: true });
  }

  get 총개수(): Locator {
    return this.page.locator('p.total');
  }

  get 정렬(): Locator {
    return this.page.getByRole('combobox', { name: '정렬' });
  }

  get 정렬선택지들(): Locator {
    return this.정렬.getByRole('option');
  }

  get 목록(): Locator {
    return this.page.getByLabel('상품 목록', { exact: true });
  }

  get 카드들(): Locator {
    return this.목록.getByRole('link');
  }

  get 품절카드들(): Locator {
    return this.page.locator('a.product.soldout');
  }

  get 빈카드들(): Locator {
    return this.page.locator('div.product-skel');
  }

  get 빈상태(): Locator {
    return this.page.getByText('조건에 맞는 상품이 없습니다');
  }

  get 끝안내(): Locator {
    return this.page.getByText('마지막 상품입니다');
  }

  카드이미지(카드: Locator): Locator {
    return 카드.getByRole('img');
  }

  카드상품명(카드: Locator): Locator {
    return 카드.locator('.name');
  }

  카드할인율(카드: Locator): Locator {
    return 카드.locator('.rate');
  }

  카드원래가격(카드: Locator): Locator {
    return 카드.locator('.origin');
  }

  카드할인가격(카드: Locator): Locator {
    return 카드.locator('.sale');
  }

  카드별점(카드: Locator): Locator {
    return 카드.locator('.stars');
  }

  카드가격들(): Promise<number[]> {
    return this.page.locator('a.product .sale').allInnerTexts().then((글자들) => 글자들.map((글자) => Number(글자.replace(/\D/g, ''))));
  }

  카드(상품명: string): Locator {
    return this.목록.getByRole('link', { name: 상품명 });
  }

  async 첫카드이름(): Promise<string> {
    return this.카드상품명(this.카드들.first()).innerText();
  }

  async 카드리뷰수들(): Promise<number[]> {
    const 글자들 = await this.page.locator('a.product .stars').allInnerTexts();
    return 글자들.map((글자) => Number(/\((\d+)\)/.exec(글자)?.[1] ?? '-1'));
  }

  async 카드이름들(): Promise<string[]> {
    return this.page.locator('a.product .name').allInnerTexts();
  }

  async 다시그려지기를기다린다(): Promise<void> {
    await this.빈카드들.first().waitFor({ state: 'detached' });
  }

  async 열기(): Promise<void> {
    await this.page.goto('/shop');
    await this.제목.waitFor();
  }

  async 응답없이열기(): Promise<void> {
    await this.page.goto('/shop', { waitUntil: 'commit' });
    await this.제목.waitFor();
  }

  async 열고기다린다(): Promise<void> {
    await this.열기();
    await this.카드들.first().waitFor();
  }

  async 끝까지내린다(개수: number): Promise<void> {
    await this.page.waitForFunction((n) => {
      window.scrollTo(0, document.body.scrollHeight);
      return document.querySelectorAll('a.product').length >= n;
    }, 개수);
  }

  async 슬라이더를옮긴다(값: number): Promise<void> {
    await this.가격슬라이더.evaluate((칸, 새값) => {
      const 입력 = 칸 as HTMLInputElement;
      입력.value = String(새값);
      입력.dispatchEvent(new Event('input', { bubbles: true }));
      입력.dispatchEvent(new Event('change', { bubbles: true }));
    }, 값);
  }

  async 슬라이더범위(): Promise<string> {
    return this.가격슬라이더.evaluate((칸) => {
      const 입력 = 칸 as HTMLInputElement;
      return `${입력.min}, ${입력.max}, ${입력.step}`;
    });
  }

  async 정렬선택값(): Promise<string> {
    return this.정렬.evaluate((칸) => (칸 as HTMLSelectElement).selectedOptions[0]?.text ?? '');
  }

  async 필터가목록왼쪽인가(): Promise<boolean> {
    const 필터 = await this.필터영역.boundingBox();
    const 첫카드 = await this.카드들.first().boundingBox();
    return 필터 !== null && 첫카드 !== null && 필터.x + 필터.width <= 첫카드.x + 1;
  }

  async 한줄카드수(): Promise<number> {
    const 위치들 = await this.카드들.evaluateAll((칸들) => 칸들.slice(0, 12).map((칸) => Math.round(칸.getBoundingClientRect().top)));
    return 위치들.filter((위) => 위 === 위치들[0]).length;
  }

  async 덮개를읽는다(카드: Locator): Promise<{ 글자: string; 배경: string }> {
    return 카드.evaluate((칸) => {
      const 모양 = getComputedStyle(칸, '::after');
      return { 글자: 모양.content.replace(/"/g, ''), 배경: 모양.backgroundColor };
    });
  }

  async 줄긋기를읽는다(카드: Locator): Promise<string> {
    return this.카드원래가격(카드).evaluate((칸) => getComputedStyle(칸).textDecorationLine);
  }

  async 글자색을읽는다(칸: Locator): Promise<string> {
    return 칸.evaluate((요소) => getComputedStyle(요소).color);
  }
}
