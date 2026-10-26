import type { Locator, Page } from '@playwright/test';

import { 머리글 } from '../components/header.component.js';

export class 상품상세화면 {
  static readonly 주소 = '/shop/:n';

  readonly 제목: Locator;
  readonly 보고있어요: Locator;
  readonly 큰이미지버튼: Locator;
  readonly 큰이미지: Locator;
  readonly 썸네일들: Locator;
  readonly 색상: Locator;
  readonly 사이즈: Locator;
  readonly 수량: Locator;
  readonly 수량줄이기: Locator;
  readonly 수량늘리기: Locator;
  readonly 총금액: Locator;
  readonly 장바구니담기: Locator;
  readonly 바로구매: Locator;
  readonly 품절버튼: Locator;
  readonly 쇼핑으로: Locator;
  readonly 설명탭: Locator;
  readonly 리뷰탭: Locator;
  readonly 문의탭: Locator;
  readonly 설명패널: Locator;
  readonly 리뷰패널: Locator;
  readonly 문의패널: Locator;
  readonly 리뷰실패안내: Locator;
  readonly 리뷰글들: Locator;
  readonly 다시시도: Locator;
  readonly 확대창: Locator;
  readonly 확대위치: Locator;
  readonly 확대다음: Locator;
  readonly 확대이전: Locator;
  readonly 확대닫기: Locator;
  readonly 확대이미지: Locator;

  constructor(private readonly page: Page) {
    this.제목 = page.getByRole('heading', { level: 1 });
    this.보고있어요 = page.getByText(/명이 보고 있어요$/);
    this.큰이미지버튼 = page.getByRole('button', { name: '크게 보기', exact: true });
    this.큰이미지 = this.큰이미지버튼.getByRole('img');
    this.썸네일들 = page.getByRole('button', { name: /^이미지 \d$/ });
    this.색상 = page.getByLabel('색상', { exact: true });
    this.사이즈 = page.getByLabel('사이즈', { exact: true });
    this.수량 = page.getByRole('spinbutton', { name: '수량' });
    this.수량줄이기 = page.getByRole('button', { name: '수량 줄이기', exact: true });
    this.수량늘리기 = page.getByRole('button', { name: '수량 늘리기', exact: true });
    this.총금액 = page.getByText(/^총 상품 금액/);
    this.장바구니담기 = page.getByRole('button', { name: '장바구니 담기', exact: true });
    this.바로구매 = page.getByRole('button', { name: '바로 구매', exact: true });
    this.품절버튼 = page.getByRole('button', { name: '품절', exact: true });
    this.쇼핑으로 = page.getByRole('link', { name: '쇼핑으로', exact: true });
    this.설명탭 = page.getByRole('tab', { name: '상품 설명', exact: true });
    this.리뷰탭 = page.getByRole('tab', { name: /^리뷰 \(\d+\)$/ });
    this.문의탭 = page.getByRole('tab', { name: '상품 문의', exact: true });
    this.설명패널 = page.getByRole('tabpanel', { name: '상품 설명', exact: true });
    this.리뷰패널 = page.getByRole('tabpanel', { name: /^리뷰/ });
    this.문의패널 = page.getByRole('tabpanel', { name: '상품 문의', exact: true });
    this.리뷰실패안내 = page.getByText('리뷰를 불러오지 못했습니다', { exact: true });
    this.리뷰글들 = this.리뷰패널.getByRole('article');
    this.다시시도 = page.getByRole('button', { name: '다시 시도', exact: true });
    this.확대창 = page.getByRole('dialog', { name: '이미지 확대 보기' });
    this.확대위치 = this.확대창.getByText(/^\d \/ 4$/);
    this.확대다음 = this.확대창.getByRole('button', { name: '다음 이미지', exact: true });
    this.확대이전 = this.확대창.getByRole('button', { name: '이전 이미지', exact: true });
    this.확대닫기 = this.확대창.getByRole('button', { name: '닫기', exact: true });
    this.확대이미지 = this.확대창.getByRole('img');
  }

  async 이동(상품번호: number): Promise<void> {
    await this.page.goto(상품상세화면.주소.replace(':n', String(상품번호)));
  }

  async 열기(상품번호: number): Promise<void> {
    await this.이동(상품번호);
    await this.다그려질때까지();
  }

  async 다그려질때까지(): Promise<void> {
    await this.설명탭.or(this.쇼핑으로).first().waitFor();
    await new 머리글(this.page).그려질때까지();
  }

  async 썸네일누르기(차례: number): Promise<void> {
    await this.page.getByRole('button', { name: `이미지 ${차례}`, exact: true }).click();
  }

  async 썸네일에올리기(차례: number): Promise<void> {
    await this.page.getByRole('button', { name: `이미지 ${차례}`, exact: true }).hover();
  }

  async 썸네일그림주소(차례: number): Promise<string> {
    const 그림 = this.page.getByRole('button', { name: `이미지 ${차례}`, exact: true }).locator('img');
    return (await 그림.getAttribute('src')) ?? '';
  }

  async 큰이미지주소(): Promise<string> {
    return (await this.큰이미지.getAttribute('src')) ?? '';
  }

  async 썸네일선택됨까지(차례: number): Promise<void> {
    await this.page.locator(`button[aria-label="이미지 ${차례}"][aria-current="true"]`).waitFor();
  }

  async 확대열기(): Promise<void> {
    await this.큰이미지버튼.click();
    await this.확대창.waitFor();
  }

  async 확대닫혔는가(): Promise<boolean> {
    try {
      await this.확대창.waitFor({ state: 'detached', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async 확대이미지가바뀔때까지(차례: number): Promise<void> {
    await this.확대창.getByRole('img', { name: new RegExp(` 이미지 ${차례}$`) }).waitFor();
  }

  async 확대위치글(): Promise<string> {
    return this.확대위치.innerText();
  }

  async 확대창이화면을덮는가(): Promise<boolean> {
    const 상자 = await this.확대창.boundingBox();
    const 화면 = this.page.viewportSize();
    if (상자 === null || 화면 === null) return false;
    return 상자.x <= 0 && 상자.y <= 0 && 상자.width >= 화면.width && 상자.height >= 화면.height;
  }

  async 옵션고르기(색상: string, 사이즈: string): Promise<void> {
    if (색상 !== '') await this.색상.selectOption({ label: 색상 });
    if (사이즈 !== '') await this.사이즈.selectOption({ label: 사이즈 });
  }

  async 수량두기(값: number): Promise<void> {
    await this.수량.fill(String(값));
  }

  async 수량읽기(): Promise<number> {
    return Number(await this.수량.inputValue());
  }

  async 총금액읽기(): Promise<number> {
    const 글 = await this.총금액.innerText();
    return Number(글.replace(/^총 상품 금액/, '').replace(/\D/g, ''));
  }

  async 보고있는사람수(): Promise<number> {
    await this.보고있어요.waitFor();
    const 글 = await this.보고있어요.innerText();
    return Number(글.replace(/\D/g, ''));
  }

  async 담기(): Promise<void> {
    await this.장바구니담기.click();
  }

  async 탭누르기(탭: Locator): Promise<void> {
    await 탭.click();
  }

  async 리뷰다시불러오기(최대: number): Promise<void> {
    for (let 회 = 0; 회 < 최대; 회 += 1) {
      await this.다시시도.click();
      await this.리뷰글들.first().or(this.리뷰실패안내).first().waitFor();
      if ((await this.리뷰글들.count()) > 0) return;
    }
  }

  async 위에있는가(요소: Locator, 기준: Locator): Promise<boolean> {
    const 가 = await 요소.boundingBox();
    const 나 = await 기준.boundingBox();
    return 가 !== null && 나 !== null && 가.y + 가.height <= 나.y + 1;
  }

  async 왼쪽에있는가(요소: Locator, 기준: Locator): Promise<boolean> {
    const 가 = await 요소.boundingBox();
    const 나 = await 기준.boundingBox();
    return 가 !== null && 나 !== null && 가.x + 가.width <= 나.x + 1;
  }

  async 주소(): Promise<string> {
    return this.page.url();
  }

  질문(글: string): Locator {
    return this.문의패널.getByRole('button', { name: 글, exact: true });
  }

  답변(글: string): Locator {
    return this.문의패널.getByText(글, { exact: true });
  }
}
