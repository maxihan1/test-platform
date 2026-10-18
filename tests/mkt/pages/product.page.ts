import type { Locator, Page } from '@playwright/test';
import { 머리글 } from '../components/header.component.js';

export class 상품상세화면 {
  static readonly 주소 = '/shop/1';
  readonly 제목: Locator;
  readonly 큰이미지버튼: Locator;
  readonly 큰이미지: Locator;
  readonly 썸네일들: Locator;
  readonly 확대창: Locator;
  readonly 확대위치: Locator;
  readonly 확대이미지: Locator;
  readonly 확대다음: Locator;
  readonly 확대이전: Locator;
  readonly 확대닫기: Locator;
  readonly 보고있어요: Locator;
  readonly 색상: Locator;
  readonly 사이즈: Locator;
  readonly 수량줄이기: Locator;
  readonly 수량늘리기: Locator;
  readonly 수량칸: Locator;
  readonly 총상품금액: Locator;
  readonly 담기: Locator;
  readonly 바로구매: Locator;
  readonly 품절버튼: Locator;
  readonly 탭들: Locator;
  readonly 리뷰탭: Locator;
  readonly 문의탭: Locator;
  readonly 설명탭: Locator;
  readonly 문의패널: Locator;
  readonly 리뷰패널: Locator;
  readonly 리뷰들: Locator;
  readonly 리뷰실패문구: Locator;
  readonly 다시시도: Locator;
  readonly 없는상품문구: Locator;
  readonly 머리글: 머리글;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { level: 1 });
    this.큰이미지버튼 = page.getByRole('button', { name: '크게 보기' });
    this.큰이미지 = this.큰이미지버튼.getByRole('img');
    this.썸네일들 = page.getByRole('button', { name: /^이미지 \d$/ });
    this.확대창 = page.getByRole('dialog', { name: '이미지 확대 보기' });
    this.확대위치 = this.확대창.getByText(/^\d \/ 4$/);
    this.확대이미지 = this.확대창.getByRole('img');
    this.확대다음 = this.확대창.getByRole('button', { name: '다음 이미지' });
    this.확대이전 = this.확대창.getByRole('button', { name: '이전 이미지' });
    this.확대닫기 = this.확대창.getByRole('button', { name: '닫기' });
    this.보고있어요 = page.getByText(/명이 보고 있어요$/);
    this.색상 = page.getByLabel('색상', { exact: true });
    this.사이즈 = page.getByLabel('사이즈', { exact: true });
    this.수량줄이기 = page.getByRole('button', { name: '수량 줄이기' });
    this.수량늘리기 = page.getByRole('button', { name: '수량 늘리기' });
    this.수량칸 = page.getByRole('spinbutton', { name: '수량' });
    this.총상품금액 = page.getByText(/^총 상품 금액/);
    this.담기 = page.getByRole('button', { name: '장바구니 담기' });
    this.바로구매 = page.getByRole('button', { name: '바로 구매' });
    this.품절버튼 = page.getByRole('button', { name: '품절', exact: true });
    this.탭들 = page.getByRole('tab');
    this.리뷰탭 = page.getByRole('tab', { name: /^리뷰 \(\d+\)$/ });
    this.문의탭 = page.getByRole('tab', { name: '상품 문의' });
    this.설명탭 = page.getByRole('tab', { name: '상품 설명' });
    this.문의패널 = page.getByRole('tabpanel', { name: '상품 문의' });
    this.리뷰패널 = page.getByRole('tabpanel', { name: /^리뷰 \(\d+\)$/ });
    this.리뷰들 = this.리뷰패널.getByRole('article');
    this.리뷰실패문구 = this.리뷰패널.getByText('리뷰를 불러오지 못했습니다');
    this.다시시도 = this.리뷰패널.getByRole('button', { name: '다시 시도' });
    this.없는상품문구 = page.getByText('상품을 찾을 수 없습니다');
    this.머리글 = new 머리글(page);
  }

  썸네일(번호: number): Locator {
    return this.page.getByRole('button', { name: `이미지 ${번호}`, exact: true });
  }

  썸네일그림(번호: number): Locator {
    return this.썸네일(번호).locator('img');
  }

  async 열기(상품번호: number): Promise<void> {
    await this.page.goto(`/shop/${상품번호}`);
    await this.큰이미지버튼.or(this.없는상품문구).filter({ visible: true }).first().waitFor();
    await this.머리글.그려질때까지();
  }

  async 확대보기열기(): Promise<void> {
    await this.큰이미지버튼.click();
    await this.확대창.waitFor();
  }

  async 확대보기닫힐때까지(): Promise<void> {
    await this.확대창.waitFor({ state: 'hidden' });
  }

  async 수량올리기(목표: number): Promise<void> {
    const 지금 = Number(await this.수량칸.inputValue());
    for (let 번 = 지금; 번 < 목표; 번 += 1) await this.수량늘리기.click();
  }

  async 수량넣기(값: number): Promise<void> {
    await this.수량칸.fill(String(값));
  }

  async 옵션고르기(색상: string, 사이즈: string): Promise<void> {
    if (색상) await this.색상.selectOption(색상);
    if (사이즈) await this.사이즈.selectOption(사이즈);
  }

  async 담기누르고응답기다리기(): Promise<void> {
    const 응답 = this.page.waitForResponse((r) => new URL(r.url()).pathname === '/api/cart' && r.request().method() === 'POST');
    await this.담기.click();
    await 응답;
  }

  질문(질문글: string): Locator {
    return this.문의패널.getByRole('button', { name: 질문글 });
  }

  답변(답변글: string): Locator {
    return this.문의패널.getByText(답변글);
  }

  async 갤러리가제목오른쪽에있나(): Promise<boolean> {
    const 갤러리 = await this.큰이미지버튼.boundingBox();
    const 제목 = await this.제목.boundingBox();
    return (갤러리?.x ?? 0) > (제목?.x ?? 0);
  }

  async 확대창이화면을덮나(): Promise<boolean> {
    const 상자 = await this.확대창.boundingBox();
    const 화면 = this.page.viewportSize();
    if (!상자 || !화면) return false;
    return 상자.width >= 화면.width && 상자.height >= 화면.height;
  }

  async 확대위치가위쪽인가(): Promise<boolean> {
    const 위치 = await this.확대위치.boundingBox();
    const 창 = await this.확대창.boundingBox();
    if (!위치 || !창) return false;
    return 위치.y - 창.y < 창.height / 4;
  }

  async 선택된썸네일일때까지(번호: number): Promise<void> {
    await this.썸네일(번호).and(this.page.locator('[aria-current="true"]')).waitFor();
  }

  async 리뷰개수읽기(): Promise<number> {
    return Number((await this.리뷰탭.innerText()).replace(/\D/g, ''));
  }

  async 아래에펼쳐졌나(질문: Locator, 답변: Locator): Promise<boolean> {
    const 위 = await 질문.boundingBox();
    const 아래 = await 답변.boundingBox();
    if (!위 || !아래 || !(await 답변.isVisible())) return false;
    return 아래.y >= 위.y + 위.height;
  }
}
