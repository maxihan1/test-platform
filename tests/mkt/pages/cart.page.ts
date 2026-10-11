import type { Locator, Page } from '@playwright/test';

export class 장바구니화면 {
  static readonly 주소 = '/cart';

  readonly page: Page;
  readonly 제목: Locator;
  readonly 불러오는중: Locator;
  readonly 빈안내: Locator;
  readonly 쇼핑하러가기: Locator;
  readonly 전체선택: Locator;
  readonly 선택삭제: Locator;
  readonly 주문하기: Locator;
  readonly 요약: Locator;
  readonly 줄들: Locator;
  readonly 줄체크박스들: Locator;
  readonly 상품금액: Locator;
  readonly 배송비: Locator;
  readonly 결제예정금액: Locator;
  readonly 무료배송안내: Locator;

  constructor(page: Page) {
    this.page = page;
    this.제목 = page.getByRole('heading', { name: '장바구니', level: 1 });
    this.불러오는중 = page.getByLabel('불러오는 중');
    this.빈안내 = page.getByText('장바구니가 비어 있습니다');
    this.쇼핑하러가기 = page.getByRole('link', { name: '쇼핑하러 가기' });
    this.전체선택 = page.getByRole('checkbox', { name: '전체 선택' });
    this.선택삭제 = page.getByRole('button', { name: '선택 삭제' });
    this.주문하기 = page.getByRole('button', { name: '주문하기' });
    this.요약 = page.getByRole('complementary', { name: '결제 요약' });
    this.줄들 = page.locator('tbody').getByRole('row');
    this.줄체크박스들 = page.locator('tbody').getByRole('checkbox');
    this.상품금액 = this.요약.locator('.sum-goods');
    this.배송비 = this.요약.locator('.sum-ship');
    this.결제예정금액 = this.요약.locator('.sum-total');
    this.무료배송안내 = this.요약.locator('.free-hint');
  }

  async 열기(): Promise<void> {
    await this.page.goto(장바구니화면.주소);
    await this.불러오는중.waitFor({ state: 'detached' });
  }

  줄(상품명: string): Locator {
    return this.줄들.filter({ hasText: 상품명 });
  }

  줄체크(상품명: string): Locator {
    return this.page.getByRole('checkbox', { name: `${상품명} 선택` });
  }

  줄수량칸(상품명: string): Locator {
    return this.page.getByRole('spinbutton', { name: `${상품명} 수량` });
  }

  줄수량늘리기(상품명: string): Locator {
    return this.줄(상품명).getByRole('button', { name: '수량 늘리기' });
  }

  줄금액(상품명: string): Locator {
    return this.줄(상품명).locator('.line-total');
  }

  async 금액읽기(칸: Locator): Promise<number> {
    return Number((await 칸.innerText()).replace(/\D/g, ''));
  }

  async 줄이름들(): Promise<string[]> {
    return this.줄들.locator('a').allInnerTexts();
  }

  async 체크상태들(): Promise<boolean[]> {
    return this.줄체크박스들.evaluateAll((칸들) => 칸들.map((칸) => (칸 as HTMLInputElement).checked));
  }

  async 줄요소보임(상품명: string, 옵션글: string): Promise<string[]> {
    const 줄 = this.줄(상품명);
    const 칸들: [string, Locator][] = [
      ['이미지', 줄.getByRole('img')],
      ['상품명', 줄.getByRole('link', { name: 상품명 })],
      ['옵션', 줄.getByText(옵션글)],
      ['수량', this.줄수량칸(상품명)],
      ['금액', this.줄금액(상품명)],
    ];
    const 보임: string[] = [];
    for (const [이름, 칸] of 칸들) if (await 칸.isVisible()) 보임.push(이름);
    return 보임;
  }

  async 요약항목보임(): Promise<string[]> {
    const 보임: string[] = [];
    for (const 이름 of ['상품 금액', '배송비', '결제 예정 금액']) if (await this.요약.getByText(이름, { exact: true }).isVisible()) 보임.push(이름);
    return 보임;
  }

  async 주문하기누르기(): Promise<void> {
    await this.주문하기.click();
  }
}
