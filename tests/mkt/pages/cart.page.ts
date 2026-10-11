import type { Locator, Page } from '@playwright/test';

export class 장바구니화면 {
  static readonly 주소 = '/cart';

  readonly 제목: Locator;
  readonly 불러오는중: Locator;
  readonly 빈문구: Locator;
  readonly 쇼핑하러가기: Locator;
  readonly 전체선택: Locator;
  readonly 선택삭제: Locator;
  readonly 줄들: Locator;
  readonly 요약: Locator;
  readonly 요약상품금액: Locator;
  readonly 요약배송비: Locator;
  readonly 요약결제예정: Locator;
  readonly 주문하기: Locator;
  readonly 무료배송안내: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { name: '장바구니', level: 1 });
    this.불러오는중 = page.getByLabel('불러오는 중');
    this.빈문구 = page.getByText('장바구니가 비어 있습니다');
    this.쇼핑하러가기 = page.getByRole('link', { name: '쇼핑하러 가기' });
    this.전체선택 = page.getByRole('checkbox', { name: '전체 선택' });
    this.선택삭제 = page.getByRole('button', { name: '선택 삭제' });
    this.줄들 = page.getByRole('row').filter({ has: page.getByRole('checkbox') });
    this.요약 = page.getByRole('complementary', { name: '결제 요약' });
    this.요약상품금액 = this.요약.locator('.sum-goods');
    this.요약배송비 = this.요약.locator('.sum-ship');
    this.요약결제예정 = this.요약.locator('.sum-total');
    this.주문하기 = this.요약.getByRole('button', { name: '주문하기' });
    this.무료배송안내 = this.요약.getByText(/더 담으면 무료 배송$/);
  }

  async 열기(): Promise<void> {
    await this.page.goto(장바구니화면.주소);
  }

  async 불러오기끝나기를기다리기(): Promise<void> {
    await this.불러오는중.waitFor({ state: 'detached' });
  }

  요약라벨(글: string): Locator {
    return this.요약.getByText(글, { exact: true });
  }

  async 모든줄체크끄기(): Promise<void> {
    const 수 = await this.줄들.count();
    for (let 번 = 0; 번 < 수; 번 += 1) await this.줄들.nth(번).getByRole('checkbox').uncheck();
  }

  줄(상품명: string): Locator {
    return this.줄들.filter({ hasText: 상품명 });
  }

  줄체크(줄: Locator): Locator {
    return 줄.getByRole('checkbox');
  }

  줄이미지(줄: Locator): Locator {
    return 줄.getByRole('img');
  }

  줄이름(줄: Locator): Locator {
    return 줄.getByRole('link');
  }

  줄옵션(줄: Locator, 글: string): Locator {
    return 줄.getByText(글, { exact: true });
  }

  줄수량(줄: Locator): Locator {
    return 줄.getByRole('spinbutton');
  }

  줄늘리기(줄: Locator): Locator {
    return 줄.getByRole('button', { name: '수량 늘리기' });
  }

  줄금액(줄: Locator): Locator {
    return 줄.locator('td.line-total');
  }

  async 금액숫자(칸: Locator): Promise<number> {
    return Number((await 칸.innerText()).replace(/[^0-9]/g, ''));
  }

  async 줄체크상태들(): Promise<boolean[]> {
    return this.줄들.getByRole('checkbox').evaluateAll((els) => els.map((el) => (el as HTMLInputElement).checked));
  }
}
