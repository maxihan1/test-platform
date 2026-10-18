import type { Locator, Page } from '@playwright/test';
import { 머리글 } from '../components/header.component.js';

export interface 배송정보 {
  받는분: string;
  연락처: string;
  우편번호: string;
  주소: string;
  상세주소: string;
  배송희망일: string;
}

export class 주문서화면 {
  static readonly 주소 = '/checkout';
  readonly 제목: Locator;
  readonly 단계표시: Locator;
  readonly 단계들: Locator;
  readonly 현재단계: Locator;
  readonly 배송정보제목: Locator;
  readonly 받는분: Locator;
  readonly 연락처: Locator;
  readonly 우편번호: Locator;
  readonly 주소칸: Locator;
  readonly 상세주소: Locator;
  readonly 요청선택: Locator;
  readonly 요청직접입력: Locator;
  readonly 배송희망일: Locator;
  readonly 주소검색: Locator;
  readonly 다음: Locator;
  readonly 이전: Locator;
  readonly 결제수단제목: Locator;
  readonly 카드사: Locator;
  readonly 할부: Locator;
  readonly 쿠폰: Locator;
  readonly 결제금액미리보기: Locator;
  readonly 최종확인제목: Locator;
  readonly 검토: Locator;
  readonly 검토제목들: Locator;
  readonly 상품목록줄들: Locator;
  readonly 동의: Locator;
  readonly 결제하기: Locator;
  readonly 비었음문구: Locator;
  readonly 장바구니로가기: Locator;
  readonly 머리글: 머리글;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '주문서', level: 1 });
    this.단계표시 = page.getByRole('list', { name: '주문 단계' });
    this.단계들 = this.단계표시.getByRole('listitem');
    this.현재단계 = this.단계표시.locator('li[aria-current="step"]');
    this.배송정보제목 = page.getByRole('heading', { name: '배송 정보', level: 2 });
    this.받는분 = page.getByLabel('받는 분', { exact: true });
    this.연락처 = page.getByLabel('연락처', { exact: true });
    this.우편번호 = page.getByLabel('우편번호', { exact: true });
    this.주소칸 = page.getByLabel('주소', { exact: true });
    this.상세주소 = page.getByLabel('상세 주소', { exact: true });
    this.요청선택 = page.getByLabel('배송 요청 사항', { exact: true });
    this.요청직접입력 = page.getByLabel('요청 사항 직접 입력', { exact: true });
    this.배송희망일 = page.getByLabel('배송 희망일', { exact: true });
    this.주소검색 = page.getByRole('button', { name: '주소 검색' });
    this.다음 = page.getByRole('button', { name: '다음' });
    this.이전 = page.getByRole('button', { name: '이전' });
    this.결제수단제목 = page.getByRole('heading', { name: '결제 수단', level: 2 });
    this.카드사 = page.getByLabel('카드사', { exact: true });
    this.할부 = page.getByLabel('할부', { exact: true });
    this.쿠폰 = page.getByLabel('쿠폰', { exact: true });
    this.결제금액미리보기 = page.getByText(/^결제 금액 [\d,]+원$/);
    this.최종확인제목 = page.getByRole('heading', { name: '최종 확인', level: 2 });
    this.검토 = page.locator('.review');
    this.검토제목들 = this.검토.getByRole('heading');
    this.상품목록줄들 = this.검토.getByRole('listitem');
    this.동의 = page.getByRole('checkbox', { name: '주문 내용을 확인했으며 결제에 동의합니다' });
    this.결제하기 = page.getByRole('button', { name: /원 결제하기$/ });
    this.비었음문구 = page.getByText('주문할 상품이 없습니다');
    this.장바구니로가기 = page.getByRole('link', { name: '장바구니로 가기' });
    this.머리글 = new 머리글(page);
  }

  오류문구(글: string): Locator {
    return this.page.getByText(글, { exact: true });
  }

  오류칸(칸: string): Locator {
    return this.page.locator(`[data-err="${칸}"]`);
  }

  async 오류나올때까지(칸: string): Promise<string> {
    await this.오류칸(칸).filter({ hasText: /\S/ }).waitFor();
    return this.오류칸(칸).innerText();
  }

  async 주소채워질때까지(): Promise<void> {
    const 칸 = await this.우편번호.elementHandle();
    await this.page.waitForFunction((대상) => (대상 as HTMLInputElement).value !== '', 칸);
  }

  라디오(이름: string): Locator {
    return this.page.getByRole('radio', { name: 이름 });
  }

  요청옵션(이름: string): Locator {
    return this.요청선택.getByRole('option', { name: 이름 });
  }

  할부옵션(이름: string): Locator {
    return this.할부.getByRole('option', { name: 이름 });
  }

  쿠폰옵션(이름: string): Locator {
    return this.쿠폰.getByRole('option', { name: 이름 });
  }

  금액줄(이름: string): Locator {
    return this.검토.locator(`dt:text-is("${이름}") + dd`);
  }

  async 열기(줄번호들: number[]): Promise<void> {
    await this.page.goto(`${주문서화면.주소}?items=${줄번호들.join(',')}`);
    await this.배송정보제목.or(this.비었음문구).filter({ visible: true }).first().waitFor();
    await this.머리글.그려질때까지();
  }

  async 아무것도없이열기(): Promise<void> {
    await this.page.goto(주문서화면.주소);
    await this.비었음문구.waitFor();
    await this.머리글.그려질때까지();
  }

  async 배송정보채우기(정보: 배송정보): Promise<void> {
    if (정보.받는분) await this.받는분.fill(정보.받는분);
    if (정보.연락처) await this.연락처.fill(정보.연락처);
    if (정보.우편번호) await this.읽기전용채우기(this.우편번호, 정보.우편번호);
    if (정보.주소) await this.읽기전용채우기(this.주소칸, 정보.주소);
    if (정보.상세주소) await this.상세주소.fill(정보.상세주소);
    if (정보.배송희망일) await this.배송희망일.fill(정보.배송희망일);
  }

  async 읽기전용채우기(칸: Locator, 값: string): Promise<void> {
    await 칸.evaluate((요소, 넣을값) => {
      (요소 as HTMLInputElement).value = 넣을값;
    }, 값);
  }

  async 다음누르기(): Promise<void> {
    await this.다음.click();
  }

  async 결제수단단계로가기(정보: 배송정보): Promise<void> {
    await this.배송정보채우기(정보);
    await this.다음누르기();
    await this.결제수단제목.waitFor();
  }

  async 결제수단고르기(이름: string): Promise<void> {
    await this.라디오(이름).check();
  }

  async 쿠폰고르기(이름: string): Promise<void> {
    await this.쿠폰옵션(이름).waitFor({ state: 'attached' });
    await this.쿠폰.selectOption({ label: 이름 });
  }

  async 최종확인단계로가기(정보: 배송정보, 결제수단: string, 쿠폰?: string): Promise<void> {
    await this.결제수단단계로가기(정보);
    await this.결제수단고르기(결제수단);
    if (쿠폰) await this.쿠폰고르기(쿠폰);
    await this.다음누르기();
    await this.최종확인제목.waitFor();
  }

  async 쿠폰불러올때까지(): Promise<void> {
    await this.쿠폰.locator('option').nth(1).waitFor({ state: 'attached' });
  }
}
