import type { Locator, Page } from '@playwright/test';

export interface 배송정보 {
  받는분: string;
  연락처: string;
  상세주소: string;
  배송희망일: string;
}

const 하루 = 86_400_000;

function 날짜글자(밀리초: number): string {
  const 날 = new Date(밀리초);
  const 월 = String(날.getMonth() + 1).padStart(2, '0');
  const 일 = String(날.getDate()).padStart(2, '0');
  return `${날.getFullYear()}-${월}-${일}`;
}

export class 주문서 {
  constructor(private readonly page: Page) {}

  get 제목(): Locator {
    return this.page.getByRole('heading', { level: 1, name: '주문서' });
  }

  get 단계표시(): Locator {
    return this.page.getByRole('list', { name: '주문 단계' });
  }

  get 단계항목들(): Locator {
    return this.단계표시.getByRole('listitem');
  }

  get 현재단계(): Locator {
    return this.단계표시.locator('li[aria-current="step"]');
  }

  get 받는분(): Locator {
    return this.page.getByRole('textbox', { name: '받는 분' });
  }

  get 연락처(): Locator {
    return this.page.getByRole('textbox', { name: '연락처' });
  }

  get 우편번호(): Locator {
    return this.page.getByRole('textbox', { name: '우편번호' });
  }

  get 주소(): Locator {
    return this.page.getByRole('textbox', { name: /^주소/ });
  }

  get 상세주소(): Locator {
    return this.page.getByRole('textbox', { name: '상세 주소' });
  }

  get 주소검색(): Locator {
    return this.page.getByRole('button', { name: '주소 검색' });
  }

  get 배송요청(): Locator {
    return this.page.getByRole('combobox', { name: '배송 요청 사항' });
  }

  get 직접입력칸(): Locator {
    return this.page.getByRole('textbox', { name: '요청 사항 직접 입력' });
  }

  get 배송희망일(): Locator {
    return this.page.getByLabel('배송 희망일');
  }

  오류문구(칸: string): Locator {
    return this.page.locator(`p.error-text[data-err="${칸}"]`);
  }

  get 첫째다음(): Locator {
    return this.page.locator('form[data-step="1"]').getByRole('button', { name: '다음' });
  }

  get 둘째다음(): Locator {
    return this.page.locator('form[data-step="2"]').getByRole('button', { name: '다음' });
  }

  get 둘째이전(): Locator {
    return this.page.locator('form[data-step="2"]').getByRole('button', { name: '이전' });
  }

  get 셋째이전(): Locator {
    return this.page.locator('form[data-step="3"]').getByRole('button', { name: '이전' });
  }

  get 결제수단묶음(): Locator {
    return this.page.getByRole('group', { name: '결제 수단' });
  }

  결제수단(이름: string): Locator {
    return this.page.getByRole('radio', { name: 이름, exact: true });
  }

  get 결제수단들(): Locator {
    return this.결제수단묶음.getByRole('radio');
  }

  get 카드사(): Locator {
    return this.page.getByRole('combobox', { name: '카드사' });
  }

  get 할부(): Locator {
    return this.page.getByRole('combobox', { name: '할부' });
  }

  할부선택지(이름: string): Locator {
    return this.할부.getByRole('option', { name: 이름, exact: true });
  }

  get 쿠폰(): Locator {
    return this.page.getByRole('combobox', { name: '쿠폰' });
  }

  get 쿠폰선택지들(): Locator {
    return this.쿠폰.getByRole('option');
  }

  쿠폰선택지(이름: string): Locator {
    return this.쿠폰.getByRole('option', { name: 이름, exact: true });
  }

  get 최종확인(): Locator {
    return this.page.locator('form[data-step="3"] .review');
  }

  최종확인제목(이름: string): Locator {
    return this.최종확인.getByRole('heading', { name: 이름 });
  }

  get 최종확인금액(): Locator {
    return this.최종확인.locator('section.summary');
  }

  최종확인금액줄(이름: string): Locator {
    return this.최종확인금액.locator(`dt:text-is("${이름}") + dd`);
  }

  get 약관동의(): Locator {
    return this.page.getByRole('checkbox', { name: '주문 내용을 확인했으며 결제에 동의합니다' });
  }

  get 결제하기(): Locator {
    return this.page.getByRole('button', { name: /원 결제하기$/ });
  }

  async 결제수단이름들(): Promise<string[]> {
    return this.결제수단들.evaluateAll((칸들) => 칸들.map((칸) => (칸 as HTMLInputElement).labels?.[0]?.textContent?.trim() ?? ''));
  }

  get 최종확인제목들(): Locator {
    return this.최종확인.getByRole('heading');
  }

  async 오류가뜨길기다린다(칸: string): Promise<void> {
    await this.page.locator(`p.error-text[data-err="${칸}"]:not(:empty)`).waitFor();
  }

  async 다음결과를기다린다(): Promise<void> {
    await this.결제수단('신용카드').or(this.page.locator('p.error-text[data-err]:not(:empty)').first()).first().waitFor();
  }

  async 열기(쿼리: string): Promise<void> {
    await this.page.goto(`/checkout${쿼리}`);
    await this.받는분.waitFor();
  }

  async 바로구매로열기(상품번호: number, 수량: number): Promise<void> {
    const 본문 = JSON.stringify({ productId: 상품번호, color: '', size: '', qty: 수량 });
    await this.열기(`?direct=${encodeURIComponent(본문)}`);
  }

  async 배송희망일범위(): Promise<{ 종류: string; 최소: string; 최대: string }> {
    return this.배송희망일.evaluate((칸) => {
      const 입력 = 칸 as HTMLInputElement;
      return { 종류: 입력.type, 최소: 입력.min, 최대: 입력.max };
    });
  }

  기대범위(): { 종류: string; 최소: string; 최대: string } {
    const 지금 = new Date();
    const 오늘 = new Date(지금.getFullYear(), 지금.getMonth(), 지금.getDate()).getTime();
    return { 종류: 'date', 최소: 날짜글자(오늘 + 2 * 하루 + 3_600_000), 최대: 날짜글자(오늘 + 14 * 하루 + 3_600_000) };
  }

  평일배송희망일(): string {
    const 지금 = new Date();
    const 오늘 = new Date(지금.getFullYear(), 지금.getMonth(), 지금.getDate()).getTime();
    for (let 뒤 = 3; 뒤 <= 14; 뒤 += 1) {
      const 날 = new Date(오늘 + 뒤 * 하루 + 3_600_000);
      if (날.getDay() !== 0) return 날짜글자(날.getTime());
    }
    return 날짜글자(오늘 + 3 * 하루);
  }

  일요일배송희망일(): string {
    const 지금 = new Date();
    const 오늘 = new Date(지금.getFullYear(), 지금.getMonth(), 지금.getDate()).getTime();
    for (let 뒤 = 2; 뒤 <= 14; 뒤 += 1) {
      const 날 = new Date(오늘 + 뒤 * 하루 + 3_600_000);
      if (날.getDay() === 0) return 날짜글자(날.getTime());
    }
    return 날짜글자(오늘 + 2 * 하루);
  }

  async 주소검색창을연다(): Promise<Page> {
    const [팝업] = await Promise.all([this.page.waitForEvent('popup'), this.주소검색.click()]);
    await 팝업.getByRole('searchbox', { name: '도로명 주소 검색어' }).waitFor();
    return 팝업;
  }

  async 팝업에서검색한다(팝업: Page, 검색어: string): Promise<void> {
    await 팝업.getByRole('searchbox', { name: '도로명 주소 검색어' }).fill(검색어);
    await 팝업.getByRole('button', { name: '검색', exact: true }).click();
    await 팝업.getByRole('list', { name: '검색 결과' }).getByRole('button').first().waitFor();
  }

  async 팝업결과를고른다(팝업: Page): Promise<void> {
    const 결과 = 팝업.getByRole('list', { name: '검색 결과' }).getByRole('button').first();
    await Promise.all([팝업.waitForEvent('close'), 결과.click()]);
  }

  async 주소를고른다(검색어: string): Promise<void> {
    const 팝업 = await this.주소검색창을연다();
    await this.팝업에서검색한다(팝업, 검색어);
    await this.팝업결과를고른다(팝업);
    await this.주소칸이찰때까지기다린다();
  }

  async 주소칸이찰때까지기다린다(): Promise<void> {
    await this.page.waitForFunction(() => {
      const 칸 = document.querySelector('input[data-k="address"]') as HTMLInputElement | null;
      return 칸 !== null && 칸.value !== '';
    });
  }

  async 배송정보를채운다(값: 배송정보): Promise<void> {
    await this.받는분.fill(값.받는분);
    await this.연락처.fill(값.연락처);
    await this.주소를고른다('강남');
    await this.상세주소.fill(값.상세주소);
    await this.배송희망일.fill(값.배송희망일);
  }

  async 둘째단계로간다(): Promise<void> {
    await this.첫째다음.click();
    await this.결제수단('신용카드').waitFor();
  }

  async 셋째단계로간다(): Promise<void> {
    await this.둘째다음.click();
    await this.약관동의.waitFor();
  }

  async 첫째단계로돌아온다(): Promise<void> {
    await this.둘째이전.click();
    await this.받는분.waitFor();
  }

  async 선택지가막혔는가(선택지: Locator): Promise<boolean> {
    return 선택지.evaluate((칸) => (칸 as HTMLOptionElement).disabled);
  }
}
