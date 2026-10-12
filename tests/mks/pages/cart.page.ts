import type { Locator, Page } from '@playwright/test';

export class 장바구니화면 {
  static readonly 주소 = '/cart';

  readonly 제목: Locator;
  readonly 전체선택: Locator;
  readonly 줄들: Locator;
  readonly 요약: Locator;
  readonly 요약결제예정: Locator;
  readonly 주문하기: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { name: '장바구니', level: 1 });
    this.전체선택 = page.getByRole('checkbox', { name: '전체 선택' });
    this.줄들 = page.getByRole('row').filter({ has: page.getByRole('checkbox') });
    this.요약 = page.getByRole('complementary', { name: '결제 요약' });
    this.요약결제예정 = this.요약.locator('dd.sum-total');
    this.주문하기 = this.요약.getByRole('button', { name: '주문하기' });
  }

  async 열기(): Promise<void> {
    await this.page.goto(장바구니화면.주소);
  }

  줄체크(줄: Locator): Locator {
    return 줄.getByRole('checkbox');
  }

  줄수량(줄: Locator): Locator {
    return 줄.getByRole('spinbutton');
  }

  줄줄이기(줄: Locator): Locator {
    return 줄.getByRole('button', { name: '수량 줄이기' });
  }

  줄늘리기(줄: Locator): Locator {
    return 줄.getByRole('button', { name: '수량 늘리기' });
  }

  줄금액(줄: Locator): Locator {
    return 줄.getByRole('cell', { name: /^[\d,]+원$/ });
  }

  async 수량적고벗어나기(줄: Locator, 수량: number): Promise<void> {
    const 칸 = this.줄수량(줄);
    await 칸.fill(String(수량));
    await 칸.blur();
  }

  async 금액숫자(칸: Locator): Promise<number> {
    return Number((await 칸.innerText()).replace(/[^0-9]/g, ''));
  }

  async 수량적고저장기다리기(줄: Locator, 수량: number): Promise<void> {
    const 저장 = this.page.waitForResponse((r) => r.request().method() === 'PATCH' && /^\/api\/cart\/\d+$/.test(new URL(r.url()).pathname));
    await this.수량적고벗어나기(줄, 수량);
    await 저장;
    await this.page.evaluate(() => new Promise<void>((끝) => requestAnimationFrame(() => requestAnimationFrame(() => 끝()))));
  }
}
