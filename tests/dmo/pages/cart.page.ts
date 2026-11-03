import type { Locator, Page } from '@playwright/test';

export class 장바구니화면 {
  static readonly 주소 = '/cart';
  readonly 제목: Locator;
  readonly 표: Locator;
  readonly 상품링크: Locator;
  readonly 불러오는중: Locator;
  readonly 빈안내: Locator;
  readonly 주문하기: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '장바구니', level: 1 });
    this.표 = page.getByRole('table');
    this.상품링크 = this.표.getByRole('link');
    this.불러오는중 = page.getByLabel('불러오는 중');
    this.빈안내 = page.getByText('장바구니가 비어 있습니다');
    this.주문하기 = page.getByRole('button', { name: '주문하기', exact: true });
  }

  async 그려질때까지(): Promise<void> {
    await this.제목.waitFor();
    await this.불러오는중.waitFor({ state: 'detached' });
  }

  async 열기(): Promise<void> {
    await this.page.goto(장바구니화면.주소);
    await this.그려질때까지();
  }
}
