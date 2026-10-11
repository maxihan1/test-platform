import type { Locator, Page } from '@playwright/test';

export class 상품목록화면 {
  static readonly 주소 = '/shop';

  readonly page: Page;
  readonly 제목: Locator;
  readonly 카드: Locator;
  readonly 품절카드: Locator;
  readonly 스켈레톤: Locator;
  readonly 총개수: Locator;
  readonly 가격슬라이더: Locator;
  readonly 가격표시: Locator;
  readonly 품절제외: Locator;
  readonly 검색칸: Locator;
  readonly 자동완성목록: Locator;
  readonly 자동완성항목: Locator;
  readonly 정렬: Locator;
  readonly 끝문구: Locator;
  readonly 빈상태문구: Locator;

  constructor(page: Page) {
    this.page = page;
    this.제목 = page.getByRole('heading', { name: '쇼핑', level: 1 });
    this.카드 = page.locator('a.product');
    this.품절카드 = page.locator('a.product.soldout');
    this.스켈레톤 = page.locator('.product-skel');
    this.총개수 = page.getByText(/^총 \d+개$/);
    this.가격슬라이더 = page.getByRole('slider', { name: '최대 가격' });
    this.가격표시 = page.locator('.price-label');
    this.품절제외 = page.getByRole('checkbox', { name: '품절 상품 제외' });
    this.검색칸 = page.getByRole('combobox', { name: '상품 검색' });
    this.자동완성목록 = page.getByRole('listbox', { name: '자동완성' });
    this.자동완성항목 = this.자동완성목록.getByRole('option');
    this.정렬 = page.getByRole('combobox', { name: '정렬' });
    this.끝문구 = page.getByText('마지막 상품입니다');
    this.빈상태문구 = page.getByText('조건에 맞는 상품이 없습니다');
  }

  카테고리(이름: string): Locator {
    return this.page.getByRole('checkbox', { name: 이름, exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto(상품목록화면.주소);
    await this.카드.first().waitFor();
  }

  async 응답기다리지않고열기(): Promise<void> {
    await this.page.goto(상품목록화면.주소);
  }

  async 불러오기끝기다리기(): Promise<void> {
    await this.스켈레톤.first().waitFor({ state: 'detached' });
  }

  async 전체개수읽기(): Promise<number> {
    const 글 = await this.총개수.innerText();
    return Number(글.replace(/\D/g, ''));
  }

  async 한번내리기(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  }

  async 끝까지내리기(): Promise<void> {
    await this.불러오기끝기다리기();
    const 전체 = await this.전체개수읽기();
    for (;;) {
      const 지금 = await this.카드.count();
      if (지금 >= 전체) return;
      await this.한번내리기();
      await this.카드.nth(Math.min(지금 + 12, 전체) - 1).waitFor();
    }
  }

  async 카드이름들(): Promise<string[]> {
    return this.카드.locator('.name').allInnerTexts();
  }

  async 카드판매가들(): Promise<number[]> {
    const 글들 = await this.카드.locator('.sale').allInnerTexts();
    return 글들.map((글) => Number(글.replace(/\D/g, '')));
  }

  async 첫줄카드수(): Promise<number> {
    const 상자들 = await this.카드.evaluateAll((카드들) => 카드들.map((el) => el.getBoundingClientRect().top));
    if (상자들.length === 0) return 0;
    return 상자들.filter((위) => Math.abs(위 - 상자들[0]) < 2).length;
  }

  async 가격옮기기(값: number): Promise<void> {
    await this.가격슬라이더.fill(String(값));
  }

  async 슬라이더끝으로밀기(): Promise<void> {
    await this.가격슬라이더.focus();
    await this.page.keyboard.press('End');
    await this.page.keyboard.press('ArrowRight');
  }

  async 카테고리고르기(이름: string): Promise<void> {
    await this.카테고리(이름).check();
  }

  async 카테고리끄기(이름: string): Promise<void> {
    await this.카테고리(이름).uncheck();
  }

  async 정렬고르기(이름: string): Promise<void> {
    await this.정렬.selectOption({ label: 이름 });
  }

  async 정렬항목들(): Promise<string[]> {
    return this.정렬.locator('option').allInnerTexts();
  }

  async 고른정렬(): Promise<string> {
    return this.정렬.evaluate((el) => (el as HTMLSelectElement).selectedOptions[0]?.textContent ?? '');
  }

  async 할인카드요소보임(): Promise<string[]> {
    const 카드 = this.카드.filter({ has: this.page.locator('.rate') }).first();
    const 칸들: [string, Locator][] = [
      ['이미지', 카드.getByRole('img')],
      ['상품명', 카드.locator('.name')],
      ['가격', 카드.locator('.sale')],
      ['할인율', 카드.locator('.rate')],
      ['별점', 카드.locator('.stars')],
    ];
    const 보임: string[] = [];
    for (const [이름, 칸] of 칸들) if (await 칸.isVisible()) 보임.push(이름);
    return 보임;
  }

  async 할인카드모양(): Promise<{ 가운데줄: boolean; 할인가빨강: boolean }> {
    const 카드 = this.카드.filter({ has: this.page.locator('.rate') }).first();
    const 원가줄 = await 카드.locator('.origin').evaluate((el) => getComputedStyle(el).textDecorationLine.includes('line-through'));
    const 할인가빨강 = await 카드.locator('.sale').evaluate((el) => {
      const [r, g, b] = getComputedStyle(el)
        .color.match(/\d+/g)!
        .map(Number);
      return r >= 150 && g <= 90 && b <= 90;
    });
    return { 가운데줄: 원가줄, 할인가빨강 };
  }

  async 품절덮개모양(): Promise<{ 글자: string; 회색덮개: boolean }> {
    const 카드 = this.품절카드.first();
    return 카드.evaluate((el) => {
      const 덮개 = getComputedStyle(el, '::after');
      const 글자 = 덮개.content.replace(/^["']|["']$/g, '');
      const [r, g, b] = (덮개.backgroundColor.match(/\d+/g) ?? ['0', '0', '0']).map(Number);
      return { 글자, 회색덮개: Math.abs(r - g) < 30 && Math.abs(g - b) < 30 && r > 60 && r < 200 };
    });
  }

  async 검색어적기(글: string): Promise<void> {
    await this.검색칸.fill(글);
  }
}
