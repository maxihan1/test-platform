import { errors, type Locator, type Page } from '@playwright/test';

export class 장바구니화면 {
  readonly 줄들: Locator;
  readonly 줄체크박스들: Locator;
  readonly 전체선택: Locator;
  readonly 선택삭제: Locator;
  readonly 주문하기: Locator;
  readonly 결제요약: Locator;
  readonly 요약상품금액: Locator;
  readonly 요약배송비: Locator;
  readonly 요약결제예정금액: Locator;
  readonly 무료배송안내: Locator;
  readonly 빈문구: Locator;
  readonly 쇼핑하러가기: Locator;
  readonly 불러오는중: Locator;

  constructor(private readonly page: Page) {
    this.줄들 = page.getByRole('row').filter({ has: page.getByRole('checkbox') });
    this.줄체크박스들 = page.getByRole('table').getByRole('checkbox');
    this.전체선택 = page.getByRole('checkbox', { name: '전체 선택', exact: true });
    this.선택삭제 = page.getByRole('button', { name: '선택 삭제', exact: true });
    this.주문하기 = page.getByRole('button', { name: '주문하기', exact: true });
    this.결제요약 = page.getByRole('complementary', { name: '결제 요약' });
    this.요약상품금액 = page.locator('.sum-goods');
    this.요약배송비 = page.locator('.sum-ship');
    this.요약결제예정금액 = page.locator('.sum-total');
    this.무료배송안내 = page.locator('.free-hint');
    this.빈문구 = page.getByText('장바구니가 비어 있습니다', { exact: true });
    this.쇼핑하러가기 = page.getByRole('link', { name: '쇼핑하러 가기', exact: true });
    this.불러오는중 = page.getByLabel('불러오는 중', { exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto('/cart');
    await this.불러오는중.waitFor({ state: 'detached' });
  }

  줄(상품명: string): Locator {
    return this.줄들.filter({ hasText: 상품명 });
  }

  줄체크박스(상품명: string): Locator {
    return this.page.getByRole('checkbox', { name: `${상품명} 선택`, exact: true });
  }

  줄수량칸(상품명: string): Locator {
    return this.page.getByRole('spinbutton', { name: `${상품명} 수량`, exact: true });
  }

  줄금액(상품명: string): Locator {
    return this.줄(상품명).locator('.line-total');
  }

  async 줄수량늘리기(상품명: string): Promise<void> {
    await this.줄(상품명).getByRole('button', { name: '수량 늘리기', exact: true }).click();
  }

  async 줄수량기다리기(상품명: string, 수: number): Promise<void> {
    const 칸 = await this.줄수량칸(상품명).elementHandle();
    if (!칸) throw new Error(`${상품명} 수량 칸을 찾지 못했다`);
    await this.page.waitForFunction(([요소, 기대]) => (요소 as HTMLInputElement).value === 기대, [칸, String(수)] as const);
  }

  async 줄체크상태들(): Promise<boolean[]> {
    return this.줄체크박스들.evaluateAll((칸들) => 칸들.map((칸) => (칸 as HTMLInputElement).checked));
  }

  async 줄상품명들(): Promise<string[]> {
    return this.줄들.getByRole('link').allInnerTexts();
  }

  async 줄마다이미지상품명옵션수량금액이보이나(): Promise<boolean> {
    const 개수 = await this.줄들.count();
    if (개수 === 0) return false;
    for (let i = 0; i < 개수; i += 1) {
      const 줄 = this.줄들.nth(i);
      const 조각 = [줄.getByRole('img'), 줄.getByRole('link'), 줄.locator('p.muted'), 줄.getByRole('spinbutton'), 줄.locator('.line-total')];
      const 보임 = await Promise.all(조각.map((것) => 것.isVisible()));
      if (!보임.every(Boolean)) return false;
    }
    return true;
  }

  async 결제요약항목이모두보이나(): Promise<string[]> {
    const 이름들 = ['상품 금액', '배송비', '결제 예정 금액'];
    const 보임 = await Promise.all(이름들.map((이름) => this.결제요약.getByText(이름, { exact: true }).isVisible()));
    return 이름들.filter((_, 순서) => 보임[순서]);
  }

  async 줄이사라지기를기다리기(상품명: string): Promise<void> {
    try {
      await this.줄체크박스(상품명).waitFor({ state: 'detached', timeout: 5000 });
    } catch (오류) {
      if (!(오류 instanceof errors.TimeoutError)) throw 오류;
    }
  }

  async 선택삭제누르기(): Promise<void> {
    await this.선택삭제.click();
  }
}
