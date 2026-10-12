import type { Locator, Page } from '@playwright/test';

export class 상품목록화면 {
  static readonly 주소 = '/shop';

  readonly 제목: Locator;
  readonly 필터: Locator;
  readonly 카테고리들: Locator;
  readonly 가격슬라이더: Locator;
  readonly 가격표시: Locator;
  readonly 품절제외: Locator;
  readonly 검색칸: Locator;
  readonly 자동완성: Locator;
  readonly 자동완성항목: Locator;
  readonly 총개수: Locator;
  readonly 정렬: Locator;
  readonly 카드들: Locator;
  readonly 빈카드들: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { name: '쇼핑', level: 1 });
    this.필터 = page.getByRole('complementary', { name: '상품 필터' });
    this.카테고리들 = this.필터.getByRole('group', { name: '카테고리' }).getByRole('checkbox');
    this.가격슬라이더 = this.필터.getByRole('slider', { name: '최대 가격' });
    this.가격표시 = this.필터.getByRole('status');
    this.품절제외 = this.필터.getByRole('checkbox', { name: '품절 상품 제외' });
    this.검색칸 = page.getByRole('combobox', { name: '상품 검색' });
    this.자동완성 = page.getByRole('listbox', { name: '자동완성' });
    this.자동완성항목 = this.자동완성.getByRole('option');
    this.총개수 = page.getByText(/^총 \d+개$/);
    this.정렬 = page.getByLabel('정렬', { exact: true });
    this.카드들 = page.getByLabel('상품 목록').getByRole('link');
    this.빈카드들 = page.locator('.product-skel');
  }

  async 열기(): Promise<void> {
    await this.page.goto(상품목록화면.주소);
  }

  async 첫화면기다리기(): Promise<void> {
    await this.카드들.first().waitFor();
  }

  카테고리(이름: string): Locator {
    return this.필터.getByRole('checkbox', { name: 이름, exact: true });
  }

  async 카테고리들이모두보이는가(): Promise<boolean> {
    const 칸들 = await this.카테고리들.all();
    const 보임 = await Promise.all(칸들.map((칸) => 칸.isVisible()));
    return 보임.length > 0 && 보임.every(Boolean);
  }

  async 슬라이더맞추기(값: number): Promise<void> {
    await this.가격슬라이더.fill(String(값));
  }

  async 첫카드이름(): Promise<string> {
    return this.카드들.first().getByRole('img').getAttribute('alt').then((글) => 글 ?? '');
  }

  async 첫카드가바뀌기를기다리기(이전이름: string): Promise<void> {
    await this.카드들.first().getByRole('img', { name: 이전이름, exact: true }).waitFor({ state: 'detached' });
    await this.빈카드들.first().waitFor({ state: 'detached' });
  }

  async 판매가들(): Promise<number[]> {
    const 글들 = await this.카드들.locator('.sale').allInnerTexts();
    return 글들.map((글) => Number(글.replace(/[^0-9]/g, '')));
  }

  async 총개수글(): Promise<string> {
    return (await this.총개수.innerText()).trim();
  }

  async 선택된정렬글(): Promise<string> {
    return this.정렬.evaluate((el) => (el as HTMLSelectElement).selectedOptions[0]?.textContent ?? '');
  }
}
