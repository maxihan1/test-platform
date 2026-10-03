import type { Locator, Page } from '@playwright/test';

export class 주문서화면 {
  constructor(private readonly page: Page) {}

  async 바로구매로열기(상품번호: number, 수량 = 1): Promise<void> {
    const 상품 = encodeURIComponent(JSON.stringify({ productId: 상품번호, color: '', size: '', qty: 수량 }));
    await this.page.goto(`/checkout?direct=${상품}`);
  }

  async 장바구니로열기(장바구니번호들: number[]): Promise<void> {
    await this.page.goto(`/checkout?items=${장바구니번호들.join(',')}`);
  }

  제목(): Locator {
    return this.page.getByRole('heading', { name: '주문서', level: 1, exact: true });
  }

  단계표시(): Locator {
    return this.page.getByRole('list', { name: '주문 단계', exact: true });
  }

  단계(이름: string): Locator {
    return this.단계표시().getByRole('listitem').filter({ hasText: 이름 });
  }

  현재단계(): Locator {
    return this.단계표시().locator('[aria-current="step"]');
  }

  배송정보제목(): Locator {
    return this.page.getByRole('heading', { name: '배송 정보', level: 2, exact: true });
  }

  결제수단제목(): Locator {
    return this.page.getByRole('heading', { name: '결제 수단', level: 2, exact: true });
  }

  최종확인제목(): Locator {
    return this.page.getByRole('heading', { name: '최종 확인', level: 2, exact: true });
  }

  받는분칸(): Locator {
    return this.page.getByLabel('받는 분', { exact: true });
  }

  연락처칸(): Locator {
    return this.page.getByLabel('연락처', { exact: true });
  }

  우편번호칸(): Locator {
    return this.page.getByLabel('우편번호', { exact: true });
  }

  주소칸(): Locator {
    return this.page.getByLabel('주소', { exact: true });
  }

  상세주소칸(): Locator {
    return this.page.getByLabel('상세 주소', { exact: true });
  }

  배송요청선택(): Locator {
    return this.page.getByLabel('배송 요청 사항', { exact: true });
  }

  async 배송요청선택지글자들(): Promise<string[]> {
    return this.배송요청선택().getByRole('option').allInnerTexts();
  }

  배송요청직접입력라벨(): Locator {
    return this.page.getByText('요청 사항 직접 입력', { exact: true });
  }

  배송요청직접입력칸(): Locator {
    return this.page.getByLabel('요청 사항 직접 입력', { exact: true });
  }

  배송희망일칸(): Locator {
    return this.page.getByLabel('배송 희망일', { exact: true });
  }

  주소검색버튼(): Locator {
    return this.page.getByRole('button', { name: '주소 검색', exact: true });
  }

  다음버튼(): Locator {
    return this.page.getByRole('button', { name: '다음', exact: true });
  }

  이전버튼(): Locator {
    return this.page.getByRole('button', { name: '이전', exact: true });
  }

  안내문구(문구: string): Locator {
    return this.page.getByText(문구, { exact: true });
  }

  결제수단라디오(이름: string): Locator {
    return this.page.getByRole('radio', { name: 이름, exact: true });
  }

  카드사선택(): Locator {
    return this.page.getByLabel('카드사', { exact: true });
  }

  할부선택(): Locator {
    return this.page.getByLabel('할부', { exact: true });
  }

  할부선택지(이름: string): Locator {
    return this.할부선택().getByRole('option', { name: 이름, exact: true });
  }

  쿠폰선택(): Locator {
    return this.page.getByLabel('쿠폰', { exact: true });
  }

  쿠폰선택지(이름: string): Locator {
    return this.쿠폰선택().getByRole('option', { name: 이름, exact: true });
  }

  async 쿠폰선택지글자들(): Promise<string[]> {
    return this.쿠폰선택().getByRole('option').allInnerTexts();
  }

  결제금액미리보기(): Locator {
    return this.page.getByText(/^결제 금액 /);
  }

  최종확인상자(): Locator {
    return this.page.locator('.review');
  }

  최종확인소제목(이름: string): Locator {
    return this.최종확인상자().getByRole('heading', { name: 이름, exact: true });
  }

  최종확인금액칸(항목: string): Locator {
    return this.최종확인상자().locator('dt').filter({ hasText: 항목 }).locator('+ dd');
  }

  동의체크(): Locator {
    return this.page.getByRole('checkbox', { name: '주문 내용을 확인했으며 결제에 동의합니다', exact: true });
  }

  결제버튼(): Locator {
    return this.page.getByRole('button', { name: /원 결제하기$/ });
  }

  async 배송정보채우기(받는분: string, 연락처: string, 우편번호: string, 주소: string, 상세주소: string, 배송희망일: string): Promise<void> {
    await this.받는분칸().fill(받는분);
    await this.연락처칸().fill(연락처);
    await this.상세주소칸().fill(상세주소);
    await this.배송희망일칸().fill(배송희망일);
    await this.우편번호칸().evaluate((칸, 값) => {
      (칸 as HTMLInputElement).value = 값;
    }, 우편번호);
    await this.주소칸().evaluate((칸, 값) => {
      (칸 as HTMLInputElement).value = 값;
    }, 주소);
  }
}
