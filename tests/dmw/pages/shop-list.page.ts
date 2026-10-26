import type { Locator, Page } from '@playwright/test';

export class 상품목록화면 {
  static readonly 주소 = '/shop';

  readonly 제목: Locator;
  readonly 필터: Locator;
  readonly 가격슬라이더: Locator;
  readonly 가격글: Locator;
  readonly 품절제외: Locator;
  readonly 검색칸: Locator;
  readonly 자동완성목록: Locator;
  readonly 자동완성항목들: Locator;
  readonly 총개수: Locator;
  readonly 정렬: Locator;
  readonly 목록: Locator;
  readonly 카드들: Locator;
  readonly 빈카드들: Locator;
  readonly 품절카드들: Locator;
  readonly 빈상태: Locator;
  readonly 마지막안내: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { level: 1, name: '쇼핑', exact: true });
    this.필터 = page.getByRole('complementary', { name: '상품 필터' });
    this.가격슬라이더 = this.필터.getByRole('slider', { name: '최대 가격' });
    this.가격글 = this.필터.getByRole('status');
    this.품절제외 = this.필터.getByRole('checkbox', { name: '품절 상품 제외' });
    this.검색칸 = page.getByRole('combobox', { name: '상품 검색' });
    this.자동완성목록 = page.getByRole('listbox', { name: '자동완성' });
    this.자동완성항목들 = this.자동완성목록.getByRole('option');
    this.총개수 = page.getByText(/^총 \d+개$/);
    this.정렬 = page.getByRole('combobox', { name: '정렬', exact: true });
    this.목록 = page.getByLabel('상품 목록', { exact: true });
    this.카드들 = this.목록.getByRole('link');
    this.빈카드들 = this.목록.locator('.product-skel');
    this.품절카드들 = this.목록.locator('a.product.soldout');
    this.빈상태 = page.getByText('조건에 맞는 상품이 없습니다', { exact: true }).filter({ visible: true });
    this.마지막안내 = page.getByText('마지막 상품입니다', { exact: true }).filter({ visible: true });
  }

  async 이동(): Promise<void> {
    await this.page.goto(상품목록화면.주소);
  }

  async 열기(): Promise<void> {
    await this.이동();
    await this.다그려질때까지();
  }

  async 다그려질때까지(): Promise<void> {
    await this.카드들.first().or(this.빈상태).first().waitFor();
  }

  async 화면너비두기(폭: number): Promise<void> {
    await this.page.setViewportSize({ width: 폭, height: 900 });
  }

  카드(상품명: string): Locator {
    return this.카드들.filter({ has: this.page.getByText(상품명, { exact: true }) });
  }

  카드이미지(카드: Locator): Locator {
    return 카드.getByRole('img');
  }

  카드상품명(카드: Locator): Locator {
    return 카드.locator('.name');
  }

  카드할인가(카드: Locator): Locator {
    return 카드.locator('.sale');
  }

  카드원가(카드: Locator): Locator {
    return 카드.locator('.origin');
  }

  카드할인율(카드: Locator): Locator {
    return 카드.locator('.rate');
  }

  카드별점(카드: Locator): Locator {
    return 카드.locator('.stars');
  }

  async 줄긋기인가(요소: Locator): Promise<boolean> {
    return (await 요소.evaluate((el) => getComputedStyle(el).textDecorationLine)) === 'line-through';
  }

  async 글자색(요소: Locator): Promise<{ r: number; g: number; b: number }> {
    const 값 = await 요소.evaluate((el) => getComputedStyle(el).color);
    const [r, g, b] = (값.match(/\d+/g) ?? []).map(Number);
    return { r: r ?? 0, g: g ?? 0, b: b ?? 0 };
  }

  async 덮개글(카드: Locator): Promise<string> {
    return 카드.evaluate((el) => getComputedStyle(el, '::after').content);
  }

  async 덮개색(카드: Locator): Promise<{ r: number; g: number; b: number }> {
    const 값 = await 카드.evaluate((el) => getComputedStyle(el, '::after').backgroundColor);
    const [r, g, b] = (값.match(/\d+/g) ?? []).map(Number);
    return { r: r ?? 0, g: g ?? 0, b: b ?? 0 };
  }

  async 첫줄카드수(): Promise<number> {
    return this.카드들.evaluateAll((카드들) => {
      if (카드들.length === 0) return 0;
      const 첫줄 = 카드들[0].getBoundingClientRect().top;
      return 카드들.filter((카드) => Math.abs(카드.getBoundingClientRect().top - 첫줄) < 2).length;
    });
  }

  async 카드수(): Promise<number> {
    return this.카드들.count();
  }

  async 총개수읽기(): Promise<number> {
    const 글 = await this.총개수.innerText();
    return Number(글.replace(/\D/g, ''));
  }

  async 총개수가바뀔때까지(글: string): Promise<void> {
    await this.page.getByText(글, { exact: true }).waitFor();
  }

  async 카드가격들(): Promise<number[]> {
    const 글들 = await this.목록.locator('.sale').allInnerTexts();
    return 글들.map((글) => Number(글.replace(/\D/g, '')));
  }

  async 카드이름들(): Promise<string[]> {
    return this.목록.locator('.name').allInnerTexts();
  }

  async 다음묶음불러오기(): Promise<void> {
    const 전 = await this.카드들.count();
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await this.카드들.nth(전).waitFor();
  }

  async 끝까지내리기(): Promise<void> {
    for (let 회 = 0; 회 < 8; 회 += 1) {
      if (await this.마지막안내.isVisible()) return;
      const 전 = await this.카드들.count();
      await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await this.카드들.nth(전).or(this.마지막안내).first().waitFor();
    }
  }

  async 카드나올때까지내리기(상품명: string): Promise<void> {
    for (let 회 = 0; 회 < 8; 회 += 1) {
      if ((await this.카드(상품명).count()) > 0 || (await this.마지막안내.isVisible())) return;
      const 전 = await this.카드들.count();
      await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await this.카드들.nth(전).or(this.마지막안내).first().waitFor();
    }
  }

  async 카테고리켜기(이름: string): Promise<void> {
    const 칸 = this.필터.getByRole('checkbox', { name: 이름, exact: true });
    await 칸.scrollIntoViewIfNeeded();
    await 칸.check();
  }

  async 카테고리끄기(이름: string): Promise<void> {
    const 칸 = this.필터.getByRole('checkbox', { name: 이름, exact: true });
    await 칸.scrollIntoViewIfNeeded();
    await 칸.uncheck();
  }

  async 품절제외켜기(): Promise<void> {
    await this.품절제외.scrollIntoViewIfNeeded();
    await this.품절제외.check();
  }

  async 최대가격두기(값: number): Promise<void> {
    await this.가격슬라이더.scrollIntoViewIfNeeded();
    await this.가격슬라이더.fill(String(값));
  }

  async 최대가격억지로두기(값: number): Promise<void> {
    await this.가격슬라이더.evaluate((칸, 새값) => {
      (칸 as HTMLInputElement).value = String(새값);
      칸.dispatchEvent(new Event('input', { bubbles: true }));
      칸.dispatchEvent(new Event('change', { bubbles: true }));
    }, 값);
  }

  async 최대가격키로올리기(): Promise<void> {
    await this.가격슬라이더.focus();
    await this.가격슬라이더.press('ArrowRight');
  }

  async 최대가격읽기(): Promise<number> {
    return Number(await this.가격슬라이더.inputValue());
  }

  async 정렬고르기(이름: string): Promise<void> {
    await this.정렬.scrollIntoViewIfNeeded();
    await this.정렬.selectOption({ label: 이름 });
  }

  async 정렬고른글(): Promise<string> {
    return this.정렬.evaluate((el) => (el as HTMLSelectElement).selectedOptions[0]?.label ?? '');
  }

  async 정렬선택지들(): Promise<string[]> {
    return this.정렬.getByRole('option').allInnerTexts();
  }

  async 검색어쓰기(글: string): Promise<void> {
    await this.검색칸.fill(글);
  }

  async 자동완성글들(): Promise<string[]> {
    return this.자동완성항목들.allInnerTexts();
  }

  async 카드누르기(상품명: string): Promise<void> {
    await this.카드(상품명).click();
  }
}
