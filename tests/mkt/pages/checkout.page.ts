import type { Locator, Page } from '@playwright/test';

export interface 배송입력 {
  받는분?: string;
  연락처?: string;
  상세주소?: string;
  희망일?: string;
  주소?: boolean;
}

export interface 배송값 {
  받는분: string;
  연락처: string;
  우편번호: string;
  주소: string;
  상세주소: string;
  희망일: string;
}

const 기본값 = { 받는분: '테스트 수령인', 연락처: '01012345678', 우편번호: '06234', 주소: '서울 강남구 테헤란로 123', 상세주소: '5층' };

function 날짜글(날: Date): string {
  const 두자리 = (수: number): string => String(수).padStart(2, '0');
  return `${날.getFullYear()}-${두자리(날.getMonth() + 1)}-${두자리(날.getDate())}`;
}

export function 배송희망일기본값(): string {
  const 날 = new Date(Date.now() + 3 * 86_400_000);
  if (날.getDay() === 0) 날.setDate(날.getDate() + 1);
  return 날짜글(날);
}

export class 주문서화면 {
  readonly 단계목록: Locator;
  readonly 단계항목들: Locator;
  readonly 현재단계: Locator;
  readonly 받는분칸: Locator;
  readonly 연락처칸: Locator;
  readonly 우편번호칸: Locator;
  readonly 주소칸: Locator;
  readonly 상세주소칸: Locator;
  readonly 배송요청상자: Locator;
  readonly 요청직접입력칸: Locator;
  readonly 배송희망일칸: Locator;
  readonly 주소검색버튼: Locator;
  readonly 다음버튼: Locator;
  readonly 이전버튼: Locator;
  readonly 카드사상자: Locator;
  readonly 할부상자: Locator;
  readonly 쿠폰상자: Locator;
  readonly 결제금액표시: Locator;
  readonly 동의체크박스: Locator;
  readonly 결제하기버튼: Locator;
  readonly 결제수단오류: Locator;
  readonly 결제수단오류자리: Locator;
  readonly 할부안내: Locator;

  constructor(private readonly page: Page) {
    this.단계목록 = page.getByRole('list', { name: '주문 단계' });
    this.단계항목들 = this.단계목록.getByRole('listitem');
    this.현재단계 = this.단계목록.locator('li[aria-current=step]');
    this.받는분칸 = page.getByLabel(/^받는 분/);
    this.연락처칸 = page.getByLabel(/^연락처/);
    this.우편번호칸 = page.getByLabel(/^우편번호/);
    this.주소칸 = page.getByLabel(/^주소/);
    this.상세주소칸 = page.getByLabel(/^상세 주소/);
    this.배송요청상자 = page.getByLabel(/^배송 요청 사항/);
    this.요청직접입력칸 = page.getByLabel(/^요청 사항 직접 입력/);
    this.배송희망일칸 = page.getByLabel(/^배송 희망일/);
    this.주소검색버튼 = page.getByRole('button', { name: '주소 검색', exact: true });
    this.다음버튼 = page.getByRole('button', { name: '다음', exact: true });
    this.이전버튼 = page.getByRole('button', { name: '이전', exact: true });
    this.카드사상자 = page.getByRole('combobox', { name: '카드사', exact: true });
    this.할부상자 = page.getByRole('combobox', { name: '할부', exact: true });
    this.쿠폰상자 = page.getByRole('combobox', { name: '쿠폰', exact: true });
    this.결제금액표시 = page.getByText(/^결제 금액 /);
    this.동의체크박스 = page.getByRole('checkbox', { name: '주문 내용을 확인했으며 결제에 동의합니다', exact: true });
    this.결제하기버튼 = page.getByRole('button', { name: /결제하기$/ });
    this.결제수단오류 = page.getByText('결제 수단을 선택하세요', { exact: true });
    this.결제수단오류자리 = page.locator('[data-err="method"]');
    this.할부안내 = page.getByText('할부는 결제 금액 50,000원 이상일 때만 고를 수 있습니다', { exact: true });
  }

  async 열기(줄번호들: number[]): Promise<void> {
    await this.page.goto(`/checkout?items=${줄번호들.join(',')}`);
    await this.받는분칸.waitFor();
  }

  async 열릴때까지기다리기(): Promise<void> {
    await this.받는분칸.waitFor();
  }

  async 배송정보칸이름들(): Promise<string[]> {
    const 칸들: Array<[string, Locator]> = [
      ['받는 분', this.받는분칸],
      ['연락처', this.연락처칸],
      ['주소', this.주소칸],
      ['상세 주소', this.상세주소칸],
      ['배송 요청 사항', this.배송요청상자],
    ];
    const 보임 = await Promise.all(칸들.map(([, 칸]) => 칸.isVisible()));
    return 칸들.filter((_, 순서) => 보임[순서]).map(([이름]) => 이름);
  }

  async 고른배송요청(): Promise<string> {
    return this.배송요청상자.evaluate((상자) => (상자 as HTMLSelectElement).selectedOptions[0]?.textContent ?? '');
  }

  async 배송요청목록(): Promise<string[]> {
    return this.배송요청상자.getByRole('option').allInnerTexts();
  }

  async 결제단계준비기다리기(): Promise<void> {
    await this.쿠폰상자.getByRole('option', { name: '10% 할인 (최대 5,000원)', exact: true }).waitFor({ state: 'attached' });
  }

  할부옵션(이름: string): Locator {
    return this.할부상자.getByRole('option', { name: 이름, exact: true });
  }

  async 현재단계이름(): Promise<string> {
    return this.현재단계.innerText();
  }

  async 단계이름들(): Promise<string[]> {
    return this.단계항목들.allInnerTexts();
  }

  async 주소칸에값넣기(우편번호: string, 주소: string): Promise<void> {
    await this.우편번호칸.evaluate((칸, 값) => {
      (칸 as HTMLInputElement).value = 값;
    }, 우편번호);
    await this.주소칸.evaluate((칸, 값) => {
      (칸 as HTMLInputElement).value = 값;
    }, 주소);
  }

  async 배송정보채우기(입력: 배송입력 = {}): Promise<void> {
    const 받는분 = 입력.받는분 ?? 기본값.받는분;
    if (받는분 !== '') await this.받는분칸.fill(받는분);
    const 연락처 = 입력.연락처 ?? 기본값.연락처;
    if (연락처 !== '') await this.연락처칸.fill(연락처);
    if (입력.주소 ?? true) await this.주소칸에값넣기(기본값.우편번호, 기본값.주소);
    const 상세주소 = 입력.상세주소 ?? 기본값.상세주소;
    if (상세주소 !== '') await this.상세주소칸.fill(상세주소);
    const 희망일 = 입력.희망일 ?? 배송희망일기본값();
    if (희망일 !== '') await this.배송희망일칸.fill(희망일);
  }

  async 배송정보값(): Promise<배송값> {
    return {
      받는분: await this.받는분칸.inputValue(),
      연락처: await this.연락처칸.inputValue(),
      우편번호: await this.우편번호칸.inputValue(),
      주소: await this.주소칸.inputValue(),
      상세주소: await this.상세주소칸.inputValue(),
      희망일: await this.배송희망일칸.inputValue(),
    };
  }

  async 채워진칸이름들(): Promise<string[]> {
    const 값 = await this.배송정보값();
    const 칸들: Array<[string, string]> = [
      ['받는 분', 값.받는분],
      ['연락처', 값.연락처],
      ['우편번호', 값.우편번호],
      ['주소', 값.주소],
      ['상세 주소', 값.상세주소],
      ['배송 희망일', 값.희망일],
    ];
    return 칸들.filter(([, 글]) => 글 !== '').map(([이름]) => 이름);
  }

  async 주소검색창열기(): Promise<Page> {
    const [창] = await Promise.all([this.page.waitForEvent('popup'), this.주소검색버튼.click()]);
    return 창;
  }

  async 주소채워짐기다리기(): Promise<void> {
    const 칸 = await this.주소칸.elementHandle();
    if (!칸) throw new Error('주소 칸을 찾지 못했다');
    await this.page.waitForFunction((요소) => (요소 as HTMLInputElement).value !== '', 칸);
  }

  async 창이닫혔나(창: Page): Promise<boolean> {
    for (let 번 = 0; 번 < 50; 번 += 1) {
      if (창.isClosed()) return true;
      await new Promise<void>((끝) => setTimeout(끝, 100));
    }
    return 창.isClosed();
  }

  오류문구(글: string): Locator {
    return this.page.getByText(글, { exact: true });
  }

  결제수단(이름: string): Locator {
    return this.page.getByRole('radio', { name: 이름, exact: true });
  }

  쿠폰옵션(이름: string): Locator {
    return this.쿠폰상자.getByRole('option', { name: 이름, exact: true });
  }

  async 결제금액(): Promise<number> {
    return Number((await this.결제금액표시.innerText()).replace(/\D/g, ''));
  }

  async 고를수있는할부(): Promise<string[]> {
    return this.할부상자.evaluate((상자) =>
      [...(상자 as HTMLSelectElement).options].filter((옵션) => !옵션.disabled).map((옵션) => 옵션.textContent ?? ''),
    );
  }

  async 할부목록(): Promise<string[]> {
    return this.할부상자.getByRole('option').allInnerTexts();
  }

  async 쿠폰목록(): Promise<string[]> {
    return this.쿠폰상자.getByRole('option').allInnerTexts();
  }

  async 쿠폰옵션을고를수없나(이름: string): Promise<boolean> {
    return this.쿠폰옵션(이름).isDisabled();
  }

  async 결제수단단계로가기(입력: 배송입력 = {}): Promise<void> {
    await this.배송정보채우기(입력);
    await this.다음버튼.click();
    await this.결제수단('신용카드').waitFor();
  }

  async 최종확인단계로가기(결제수단이름: string, 쿠폰이름?: string): Promise<void> {
    await this.결제수단(결제수단이름).check();
    if (쿠폰이름 !== undefined) await this.쿠폰상자.selectOption({ label: 쿠폰이름 });
    await this.다음버튼.click();
    await this.동의체크박스.waitFor();
  }

  최종확인구역(제목: string): Locator {
    return this.page.getByRole('heading', { name: 제목, exact: true });
  }

  async 최종금액표(): Promise<Record<string, string>> {
    const 이름들 = await this.page.getByRole('term').allInnerTexts();
    const 값들 = await this.page.getByRole('definition').allInnerTexts();
    return Object.fromEntries(이름들.map((이름, 순서) => [이름, 값들[순서] ?? '']));
  }

  async 최종확인상품줄들(): Promise<string[]> {
    return this.page
      .locator('section.review-block', { has: this.page.getByRole('heading', { name: '상품 목록', exact: true }) })
      .getByRole('listitem')
      .allInnerTexts();
  }

  async 결제버튼상태(): Promise<string> {
    const 글 = await this.결제하기버튼.innerText();
    const 꺼짐 = await this.결제하기버튼.isDisabled();
    return `${글} · ${꺼짐 ? '눌리지 않음' : '눌림'}`;
  }

  async 브라우저날짜(): Promise<string> {
    return this.page.evaluate(() => {
      const 지금 = new Date();
      const 요일 = ['일', '월', '화', '수', '목', '금', '토'][지금.getDay()] ?? '';
      return `${지금.toLocaleDateString('sv-SE')}(${요일})`;
    });
  }
}
