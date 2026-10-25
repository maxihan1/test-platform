import type { Locator, Page } from '@playwright/test';

export class 장바구니화면 {
  static readonly 주소 = '/cart';

  readonly 제목: Locator;
  readonly 전체선택: Locator;
  readonly 선택삭제: Locator;
  readonly 표: Locator;
  readonly 줄들: Locator;
  readonly 줄체크들: Locator;
  readonly 결제요약: Locator;
  readonly 상품금액: Locator;
  readonly 배송비: Locator;
  readonly 결제예정금액: Locator;
  readonly 무료배송안내: Locator;
  readonly 주문하기: Locator;
  readonly 비었음안내: Locator;
  readonly 쇼핑하러가기: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { level: 1, name: '장바구니', exact: true });
    this.전체선택 = page.getByRole('checkbox', { name: '전체 선택', exact: true });
    this.선택삭제 = page.getByRole('button', { name: '선택 삭제', exact: true });
    this.표 = page.getByRole('table');
    this.줄들 = this.표.getByRole('row').filter({ has: page.getByRole('checkbox') });
    this.줄체크들 = this.줄들.getByRole('checkbox');
    this.결제요약 = page.getByRole('complementary', { name: '결제 요약' });
    this.상품금액 = page.locator('.sum-goods');
    this.배송비 = page.locator('.sum-ship');
    this.결제예정금액 = page.locator('.sum-total');
    this.무료배송안내 = page.getByText(/더 담으면 무료 배송$/);
    this.주문하기 = page.getByRole('button', { name: '주문하기', exact: true });
    this.비었음안내 = page.getByText('장바구니가 비어 있습니다', { exact: true }).filter({ visible: true });
    this.쇼핑하러가기 = page.getByRole('link', { name: '쇼핑하러 가기', exact: true });
  }

  async 이동(): Promise<void> {
    await this.page.goto(장바구니화면.주소);
  }

  async 열기(): Promise<void> {
    await this.이동();
    await this.다그려질때까지();
  }

  async 다그려질때까지(): Promise<void> {
    await this.줄들.first().or(this.비었음안내).first().waitFor();
  }

  줄(상품명: string): Locator {
    return this.줄들.filter({ has: this.page.getByRole('link', { name: 상품명, exact: true }) });
  }

  줄체크(상품명: string): Locator {
    return this.줄(상품명).getByRole('checkbox');
  }

  줄수량(상품명: string): Locator {
    return this.줄(상품명).getByRole('spinbutton');
  }

  줄수량늘리기(상품명: string): Locator {
    return this.줄(상품명).getByRole('button', { name: '수량 늘리기', exact: true });
  }

  줄금액(상품명: string): Locator {
    return this.줄(상품명).locator('.line-total');
  }

  줄이미지(상품명: string): Locator {
    return this.줄(상품명).getByRole('img');
  }

  줄상품명링크(상품명: string): Locator {
    return this.줄(상품명).getByRole('link', { name: 상품명, exact: true });
  }

  async 줄옵션글(상품명: string): Promise<string> {
    return this.줄(상품명).locator('.muted').innerText();
  }

  async 줄수량읽기(상품명: string): Promise<number> {
    return Number(await this.줄수량(상품명).inputValue());
  }

  async 줄금액읽기(상품명: string): Promise<number> {
    return 금액(await this.줄금액(상품명).innerText());
  }

  async 줄금액이바뀔때까지(상품명: string, 글: string): Promise<void> {
    await this.줄금액(상품명).filter({ hasText: 글 }).waitFor();
  }

  async 체크줄수(): Promise<number> {
    return this.줄체크들.evaluateAll((목록) => 목록.filter((체크) => (체크 as HTMLInputElement).checked).length);
  }

  async 모든체크끄기(): Promise<void> {
    await this.전체선택.uncheck();
  }

  요약항목(이름: string): Locator {
    return this.결제요약.getByText(이름, { exact: true });
  }

  async 상품금액읽기(): Promise<number> {
    return 금액(await this.상품금액.innerText());
  }

  async 배송비읽기(): Promise<number> {
    return 금액(await this.배송비.innerText());
  }

  async 결제예정금액읽기(): Promise<number> {
    return 금액(await this.결제예정금액.innerText());
  }

  async 상품금액이바뀔때까지(글: string): Promise<void> {
    await this.상품금액.filter({ hasText: 글 }).waitFor();
  }
}

function 금액(글: string): number {
  return Number(글.replace(/\D/g, ''));
}
