import type { Locator, Page } from '@playwright/test';

export class 장바구니화면 {
  constructor(private readonly page: Page) {}

  get 제목(): Locator {
    return this.page.getByRole('heading', { level: 1, name: '장바구니' });
  }

  get 전체선택(): Locator {
    return this.page.getByRole('checkbox', { name: '전체 선택' });
  }

  get 선택삭제(): Locator {
    return this.page.getByRole('button', { name: '선택 삭제' });
  }

  get 줄들(): Locator {
    return this.page.locator('tbody tr');
  }

  줄(상품명: string): Locator {
    return this.줄들.filter({ has: this.page.getByRole('link', { name: 상품명, exact: true }) });
  }

  줄체크(상품명: string): Locator {
    return this.page.getByRole('checkbox', { name: `${상품명} 선택` });
  }

  get 줄체크들(): Locator {
    return this.줄들.getByRole('checkbox');
  }

  줄상품링크(상품명: string): Locator {
    return this.줄(상품명).getByRole('link', { name: 상품명, exact: true });
  }

  줄이미지(상품명: string): Locator {
    return this.줄(상품명).getByRole('img', { name: 상품명, exact: true });
  }

  줄옵션(상품명: string): Locator {
    return this.줄(상품명).locator('p.muted');
  }

  줄수량칸(상품명: string): Locator {
    return this.page.getByRole('spinbutton', { name: `${상품명} 수량` });
  }

  줄수량늘리기(상품명: string): Locator {
    return this.줄(상품명).getByRole('button', { name: '수량 늘리기' });
  }

  줄금액(상품명: string): Locator {
    return this.줄(상품명).locator('td.line-total');
  }

  get 결제요약(): Locator {
    return this.page.getByRole('complementary', { name: '결제 요약' });
  }

  get 상품금액(): Locator {
    return this.결제요약.locator('dd.sum-goods');
  }

  get 배송비(): Locator {
    return this.결제요약.locator('dd.sum-ship');
  }

  get 결제예정금액(): Locator {
    return this.결제요약.locator('dd.sum-total');
  }

  get 무료배송안내(): Locator {
    return this.결제요약.locator('p.free-hint');
  }

  get 주문하기(): Locator {
    return this.page.getByRole('button', { name: '주문하기' });
  }

  get 비어있음문구(): Locator {
    return this.page.getByText('장바구니가 비어 있습니다');
  }

  get 쇼핑하러가기(): Locator {
    return this.page.getByRole('link', { name: '쇼핑하러 가기' });
  }

  get 확인창(): Locator {
    return this.page.getByRole('dialog', { name: '확인' });
  }

  get 확인창확인(): Locator {
    return this.확인창.getByRole('button', { name: '확인', exact: true });
  }

  get 결제요약항목들(): Locator {
    return this.결제요약.locator('dt');
  }

  get 확인창본문(): Locator {
    return this.확인창.getByText(/선택한 상품 \d+개를 삭제하시겠습니까\?/);
  }

  async 체크된줄수(): Promise<number> {
    return this.줄체크들.evaluateAll((칸들) => 칸들.filter((칸) => (칸 as HTMLInputElement).checked).length);
  }

  async 요약이오른쪽인가(): Promise<boolean> {
    const 요약 = await this.결제요약.boundingBox();
    const 표 = await this.줄들.first().boundingBox();
    return 요약 !== null && 표 !== null && 요약.x >= 표.x + 표.width - 1;
  }

  async 줄금액을기다린다(상품명: string, 글자: string): Promise<void> {
    await this.줄금액(상품명).filter({ hasText: 글자 }).waitFor();
  }

  async 줄이지워졌는가(상품명: string): Promise<boolean> {
    return this.줄(상품명).waitFor({ state: 'detached', timeout: 5000 }).then(
      () => true,
      () => false,
    );
  }

  async 열기(): Promise<void> {
    await this.page.goto('/cart');
    await this.제목.waitFor();
  }

  async 줄이나타나기를기다린다(): Promise<void> {
    await this.줄들.first().waitFor();
  }

  async 비어있음을기다린다(): Promise<void> {
    await this.비어있음문구.waitFor();
  }
}
