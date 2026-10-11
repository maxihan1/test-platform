import type { Locator, Page } from '@playwright/test';

export interface 배송입력 {
  받는분: string;
  연락처: string;
  우편번호: string;
  주소: string;
  상세주소: string;
  희망일: string;
}

export class 주문서화면 {
  static readonly 주소 = '/checkout';

  readonly page: Page;
  readonly 제목: Locator;
  readonly 단계표시: Locator;
  readonly 지금단계: Locator;
  readonly 받는분: Locator;
  readonly 연락처: Locator;
  readonly 우편번호: Locator;
  readonly 주소: Locator;
  readonly 상세주소: Locator;
  readonly 요청사항: Locator;
  readonly 요청직접입력: Locator;
  readonly 희망일: Locator;
  readonly 주소검색버튼: Locator;
  readonly 다음: Locator;
  readonly 이전: Locator;
  readonly 결제수단단계: Locator;
  readonly 최종확인단계: Locator;
  readonly 카드사: Locator;
  readonly 할부: Locator;
  readonly 쿠폰: Locator;
  readonly 결제금액미리보기: Locator;
  readonly 동의: Locator;
  readonly 결제하기: Locator;
  readonly 최종확인내용: Locator;
  readonly 할부안내: Locator;

  constructor(page: Page) {
    this.page = page;
    this.제목 = page.getByRole('heading', { name: '주문서', level: 1 });
    this.단계표시 = page.getByRole('list', { name: '주문 단계' });
    this.지금단계 = this.단계표시.locator('[aria-current="step"]');
    this.받는분 = page.getByLabel('받는 분');
    this.연락처 = page.getByLabel('연락처');
    this.우편번호 = page.getByLabel('우편번호');
    this.주소 = page.getByLabel(/^주소/);
    this.상세주소 = page.getByLabel(/^상세 주소/);
    this.요청사항 = page.getByLabel('배송 요청 사항');
    this.요청직접입력 = page.getByLabel('요청 사항 직접 입력');
    this.희망일 = page.getByLabel('배송 희망일');
    this.주소검색버튼 = page.getByRole('button', { name: '주소 검색' });
    this.다음 = page.getByRole('button', { name: '다음' });
    this.이전 = page.getByRole('button', { name: '이전' });
    this.결제수단단계 = page.getByRole('heading', { name: '결제 수단', level: 2 });
    this.최종확인단계 = page.getByRole('heading', { name: '최종 확인', level: 2 });
    this.카드사 = page.getByLabel('카드사');
    this.할부 = page.getByLabel('할부');
    this.쿠폰 = page.getByLabel('쿠폰');
    this.결제금액미리보기 = page.getByText(/^결제 금액 /);
    this.동의 = page.getByRole('checkbox', { name: '주문 내용을 확인했으며 결제에 동의합니다' });
    this.결제하기 = page.getByRole('button', { name: /결제하기$/ });
    this.최종확인내용 = page.locator('.review');
    this.할부안내 = page.getByText('할부는 결제 금액 50,000원 이상일 때만 고를 수 있습니다');
  }

  async 장바구니줄로열기(줄번호들: number[]): Promise<void> {
    await this.page.goto(`${주문서화면.주소}?items=${줄번호들.join(',')}`);
    await this.받는분.waitFor();
  }

  async 직접구매로열기(상품: { productId: number; qty: number; color?: string; size?: string }): Promise<void> {
    const 줄 = { productId: 상품.productId, color: 상품.color ?? '', size: 상품.size ?? '', qty: 상품.qty };
    await this.page.goto(`${주문서화면.주소}?direct=${encodeURIComponent(JSON.stringify(줄))}`);
    await this.받는분.waitFor();
  }

  async 배송정보채우기(입력: 배송입력): Promise<void> {
    await this.받는분.fill(입력.받는분);
    await this.연락처.fill(입력.연락처);
    await this.우편번호.evaluate((el, 값) => ((el as HTMLInputElement).value = 값), 입력.우편번호);
    await this.주소.evaluate((el, 값) => ((el as HTMLInputElement).value = 값), 입력.주소);
    await this.상세주소.fill(입력.상세주소);
    await this.희망일.fill(입력.희망일);
  }

  async 배송정보읽기(): Promise<배송입력> {
    return {
      받는분: await this.받는분.inputValue(),
      연락처: await this.연락처.inputValue(),
      우편번호: await this.우편번호.inputValue(),
      주소: await this.주소.inputValue(),
      상세주소: await this.상세주소.inputValue(),
      희망일: await this.희망일.inputValue(),
    };
  }

  async 단계이름들(): Promise<string[]> {
    return this.단계표시.getByRole('listitem').allInnerTexts();
  }

  async 주소비우기(): Promise<void> {
    await this.우편번호.evaluate((el) => ((el as HTMLInputElement).value = ''));
    await this.주소.evaluate((el) => ((el as HTMLInputElement).value = ''));
  }

  async 주소채워짐기다리기(): Promise<void> {
    await this.page.waitForFunction(() => {
      const 칸 = document.querySelector<HTMLInputElement>('[data-k="address"]');
      return 칸 !== null && 칸.value !== '';
    });
  }

  async 연락처적기(글: string): Promise<void> {
    await this.연락처.fill('');
    await this.연락처.pressSequentially(글);
  }

  async 브라우저오늘(): Promise<string> {
    return this.page.evaluate(() => {
      const 날 = new Date();
      const 두자리 = (n: number) => String(n).padStart(2, '0');
      return `${날.getFullYear()}-${두자리(날.getMonth() + 1)}-${두자리(날.getDate())}`;
    });
  }

  async 최종확인항목보임(): Promise<string[]> {
    const 보임: string[] = [];
    for (const 이름 of ['상품 목록', '배송 정보', '결제 수단', '결제 금액']) {
      if (await this.최종확인내용.getByRole('heading', { name: 이름 }).isVisible()) 보임.push(이름);
    }
    return 보임;
  }

  async 다음누르기(): Promise<void> {
    await this.다음.click();
  }

  async 이전누르기(): Promise<void> {
    await this.이전.click();
  }

  결제수단(이름: string): Locator {
    return this.page.getByRole('radio', { name: 이름 });
  }

  async 결제수단고르기(이름: string): Promise<void> {
    await this.결제수단(이름).check();
  }

  오류문구(글: string): Locator {
    return this.page.getByText(글, { exact: true });
  }

  쿠폰항목(글: string): Locator {
    return this.쿠폰.locator('option', { hasText: 글 });
  }

  async 쿠폰고르기(글: string): Promise<void> {
    const 값 = await this.쿠폰항목(글).getAttribute('value');
    await this.쿠폰.selectOption(값 ?? '');
  }

  할부항목(글: string): Locator {
    return this.할부.locator('option', { hasText: 글 });
  }

  async 금액요약읽기(): Promise<Record<string, number>> {
    const 쌍들 = await this.최종확인내용.locator('dl').evaluate((dl) => {
      const 결과: [string, string][] = [];
      const dt = [...dl.querySelectorAll('dt')];
      const dd = [...dl.querySelectorAll('dd')];
      dt.forEach((t, i) => 결과.push([t.textContent ?? '', dd[i]?.textContent ?? '']));
      return 결과;
    });
    const 읽기: Record<string, number> = {};
    for (const [이름, 값] of 쌍들) 읽기[이름] = (값.startsWith('-') ? -1 : 1) * Number(값.replace(/\D/g, ''));
    return 읽기;
  }
}
