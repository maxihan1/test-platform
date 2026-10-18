import type { Locator, Page } from '@playwright/test';
import { 머리글 } from '../components/header.component.js';

export class 장바구니화면 {
  static readonly 주소 = '/cart';
  readonly 제목: Locator;
  readonly 전체선택: Locator;
  readonly 선택삭제: Locator;
  readonly 줄들: Locator;
  readonly 줄체크박스들: Locator;
  readonly 요약: Locator;
  readonly 무료배송안내: Locator;
  readonly 주문하기: Locator;
  readonly 비었음문구: Locator;
  readonly 쇼핑하러가기: Locator;
  readonly 머리글: 머리글;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '장바구니', level: 1 });
    this.전체선택 = page.getByRole('checkbox', { name: '전체 선택' });
    this.선택삭제 = page.getByRole('button', { name: '선택 삭제' });
    this.줄들 = page.getByRole('table').getByRole('row').filter({ has: page.getByRole('checkbox') });
    this.줄체크박스들 = this.줄들.getByRole('checkbox');
    this.요약 = page.getByRole('complementary', { name: '결제 요약' });
    this.무료배송안내 = this.요약.getByText(/더 담으면 무료 배송$/);
    this.주문하기 = this.요약.getByRole('button', { name: '주문하기' });
    this.비었음문구 = page.getByText('장바구니가 비어 있습니다');
    this.쇼핑하러가기 = page.getByRole('link', { name: '쇼핑하러 가기' });
    this.머리글 = new 머리글(page);
  }

  줄(상품명: string): Locator {
    return this.줄들.filter({ has: this.page.getByRole('link', { name: 상품명, exact: true }) });
  }

  줄체크(줄: Locator): Locator {
    return 줄.getByRole('checkbox');
  }

  줄이미지(줄: Locator): Locator {
    return 줄.getByRole('img');
  }

  줄상품명(줄: Locator): Locator {
    return 줄.getByRole('link');
  }

  줄수량칸(줄: Locator): Locator {
    return 줄.getByRole('spinbutton');
  }

  줄수량늘리기(줄: Locator): Locator {
    return 줄.getByRole('button', { name: '수량 늘리기' });
  }

  줄금액(줄: Locator): Locator {
    return 줄.getByRole('cell').last();
  }

  옵션글(줄: Locator, 글: string): Locator {
    return 줄.getByText(글, { exact: true });
  }

  요약값(이름: string): Locator {
    return this.요약.locator(`dt:text-is("${이름}") + dd`);
  }

  async 열기(): Promise<void> {
    await this.열기만();
    await this.줄들.first().or(this.비었음문구).filter({ visible: true }).first().waitFor();
  }

  async 열기만(): Promise<void> {
    await this.page.goto(장바구니화면.주소);
    await this.제목.waitFor();
    await this.머리글.그려질때까지();
  }

  async 켜진줄수(): Promise<number> {
    return this.줄체크박스들.evaluateAll((칸들) => 칸들.filter((칸) => (칸 as HTMLInputElement).checked).length);
  }

  async 수량칸값이될때까지(줄: Locator, 값: string): Promise<void> {
    const 칸 = await this.줄수량칸(줄).elementHandle();
    await this.page.waitForFunction(([대상, 기대]) => (대상 as HTMLInputElement).value === 기대, [칸, 값] as const);
  }
}
