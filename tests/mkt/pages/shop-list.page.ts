import type { Locator, Page } from '@playwright/test';

export class 상품목록화면 {
  constructor(private readonly page: Page) {}

  async 열기(): Promise<void> {
    await this.page.goto('/shop');
  }

  제목(): Locator {
    return this.page.getByRole('heading', { name: '쇼핑', exact: true });
  }

  필터영역(): Locator {
    return this.page.getByRole('complementary', { name: '상품 필터', exact: true });
  }

  카테고리체크(이름: string): Locator {
    return this.필터영역().getByRole('checkbox', { name: 이름, exact: true });
  }

  카테고리체크들(): Locator {
    return this.필터영역().getByRole('group', { name: '카테고리', exact: true }).getByRole('checkbox');
  }

  가격슬라이더(): Locator {
    return this.필터영역().getByRole('slider', { name: '최대 가격', exact: true });
  }

  가격표시(): Locator {
    return this.필터영역().getByRole('status');
  }

  품절제외스위치(): Locator {
    return this.필터영역().getByRole('checkbox', { name: '품절 상품 제외', exact: true });
  }

  총개수(): Locator {
    return this.page.getByText(/^총 \d+개$/);
  }

  총개수문구(문구: string): Locator {
    return this.page.getByText(문구, { exact: true });
  }

  정렬선택(): Locator {
    return this.page.getByLabel('정렬', { exact: true });
  }

  정렬선택지(): Locator {
    return this.정렬선택().getByRole('option');
  }

  선택된정렬(): Locator {
    return this.정렬선택().locator('option:checked');
  }

  상품목록(): Locator {
    return this.page.getByLabel('상품 목록', { exact: true });
  }

  상품카드들(): Locator {
    return this.상품목록().getByRole('link');
  }

  상품카드(상품명: string): Locator {
    return this.상품카드들().filter({ has: this.page.getByText(상품명, { exact: true }) });
  }

  카드이름들(): Locator {
    return this.상품카드들().locator('.name');
  }

  카드판매가들(): Locator {
    return this.상품카드들().locator('.sale');
  }

  카드이미지(상품명: string): Locator {
    return this.상품카드(상품명).getByRole('img', { name: 상품명, exact: true });
  }

  카드별점(상품명: string): Locator {
    return this.상품카드(상품명).getByText(/^★/);
  }

  카드글자(상품명: string, 글자: string): Locator {
    return this.상품카드(상품명).getByText(글자, { exact: true });
  }

  async 가격슬라이더속성(이름: 'min' | 'max' | 'step'): Promise<string | null> {
    return this.가격슬라이더().getAttribute(이름);
  }

  async 카드글자줄긋기(상품명: string, 글자: string): Promise<string> {
    return this.카드글자(상품명, 글자).evaluate((칸) => getComputedStyle(칸).textDecorationLine);
  }

  async 카드글자색(상품명: string, 글자: string): Promise<string> {
    return this.카드글자(상품명, 글자).evaluate((칸) => getComputedStyle(칸).color);
  }

  async 카드덮개글자(상품명: string): Promise<string> {
    return this.상품카드(상품명).evaluate((카드) => getComputedStyle(카드, '::after').content);
  }

  async 카드덮개배경색(상품명: string): Promise<string> {
    return this.상품카드(상품명).evaluate((카드) => getComputedStyle(카드, '::after').backgroundColor);
  }

  async 카드세로위치들(): Promise<number[]> {
    return this.상품카드들().evaluateAll((카드들) => 카드들.map((카드) => Math.round(카드.getBoundingClientRect().top)));
  }

  빈목록문구(): Locator {
    return this.page.getByText('조건에 맞는 상품이 없습니다', { exact: true });
  }

  마지막상품문구(): Locator {
    return this.page.getByText('마지막 상품입니다', { exact: true });
  }

  async 끝까지내리기(총개수: number): Promise<void> {
    while ((await this.상품카드들().count()) < 총개수) {
      const 지금 = await this.상품카드들().count();
      await this.상품카드들().last().scrollIntoViewIfNeeded();
      await this.상품카드들().nth(지금).waitFor();
    }
    await this.상품카드들().last().scrollIntoViewIfNeeded();
  }

  async 맨아래카드로내리기(): Promise<void> {
    await this.상품카드들().last().scrollIntoViewIfNeeded();
  }

  async 가격맞추기(값: number): Promise<void> {
    await this.가격슬라이더().fill(String(값));
  }

  async 정렬고르기(이름: string): Promise<void> {
    await this.정렬선택().selectOption({ label: 이름 });
  }

  검색칸(): Locator {
    return this.page.getByRole('combobox', { name: '상품 검색', exact: true });
  }

  자동완성목록(): Locator {
    return this.page.getByRole('listbox', { name: '자동완성', exact: true });
  }

  자동완성항목들(): Locator {
    return this.자동완성목록().getByRole('option');
  }

  자동완성항목(상품명: string): Locator {
    return this.자동완성목록().getByRole('option', { name: 상품명, exact: true });
  }

  빈카드들(): Locator {
    return this.상품목록().locator('.product-skel');
  }

  async 검색어적기(글자: string): Promise<void> {
    await this.검색칸().fill('');
    await this.검색칸().pressSequentially(글자);
  }

  async 자동완성이검색칸아래에있는가(): Promise<boolean> {
    const 칸상자 = await this.검색칸().boundingBox();
    const 목록상자 = await this.자동완성목록().boundingBox();
    return 칸상자 !== null && 목록상자 !== null && 칸상자.y + 칸상자.height <= 목록상자.y + 1;
  }

  async 빈카드바탕색(): Promise<string> {
    return this.빈카드들().first().evaluate((카드) => getComputedStyle(카드).backgroundColor);
  }
}
