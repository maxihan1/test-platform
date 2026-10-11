import type { Locator, Page } from '@playwright/test';

export class 상품상세화면 {
  static readonly 주소 = '/shop/{id}';

  readonly page: Page;
  readonly 상품명: Locator;
  readonly 큰이미지버튼: Locator;
  readonly 큰이미지: Locator;
  readonly 썸네일들: Locator;
  readonly 시청수: Locator;
  readonly 판매가: Locator;
  readonly 색상: Locator;
  readonly 사이즈: Locator;
  readonly 수량줄이기: Locator;
  readonly 수량늘리기: Locator;
  readonly 수량칸: Locator;
  readonly 총상품금액: Locator;
  readonly 장바구니담기: Locator;
  readonly 바로구매: Locator;
  readonly 품절버튼: Locator;
  readonly 탭목록: Locator;
  readonly 확대창: Locator;
  readonly 확대위치: Locator;
  readonly 확대이미지: Locator;
  readonly 없는상품안내: Locator;
  readonly 리뷰불러오는중: Locator;
  readonly 리뷰불러오기실패: Locator;
  readonly 다시시도: Locator;
  readonly 리뷰들: Locator;
  readonly 문의패널: Locator;

  constructor(page: Page) {
    this.page = page;
    this.상품명 = page.getByRole('heading', { level: 1 });
    this.큰이미지버튼 = page.getByRole('button', { name: '크게 보기' });
    this.큰이미지 = this.큰이미지버튼.getByRole('img');
    this.썸네일들 = page.getByRole('button', { name: /^이미지 \d$/ });
    this.시청수 = page.getByText(/명이 보고 있어요$/);
    this.판매가 = page.locator('.price-line .sale');
    this.색상 = page.getByLabel('색상', { exact: true });
    this.사이즈 = page.getByLabel('사이즈', { exact: true });
    this.수량줄이기 = page.getByRole('button', { name: '수량 줄이기' });
    this.수량늘리기 = page.getByRole('button', { name: '수량 늘리기' });
    this.수량칸 = page.getByRole('spinbutton', { name: '수량' });
    this.총상품금액 = page.getByText('총 상품 금액').locator('strong');
    this.장바구니담기 = page.getByRole('button', { name: '장바구니 담기' });
    this.바로구매 = page.getByRole('button', { name: '바로 구매' });
    this.품절버튼 = page.getByRole('button', { name: '품절', exact: true });
    this.탭목록 = page.getByRole('tablist', { name: '상품 정보' });
    this.확대창 = page.getByRole('dialog', { name: '이미지 확대 보기' });
    this.확대위치 = this.확대창.getByText(/^\d \/ 4$/);
    this.확대이미지 = this.확대창.getByRole('img');
    this.없는상품안내 = page.getByRole('heading', { name: '상품을 찾을 수 없습니다' });
    this.리뷰불러오는중 = page.getByText('리뷰를 불러오는 중…');
    this.리뷰불러오기실패 = page.getByText('리뷰를 불러오지 못했습니다');
    this.다시시도 = page.getByRole('button', { name: '다시 시도' });
    this.리뷰들 = page.getByRole('tabpanel').getByRole('article');
    this.문의패널 = page.getByRole('tabpanel', { name: '상품 문의' });
  }

  async 열기(번호: number): Promise<void> {
    await this.page.goto(`/shop/${번호}`);
    await this.큰이미지버튼.or(this.없는상품안내).waitFor();
  }

  썸네일(번호: number): Locator {
    return this.page.getByRole('button', { name: `이미지 ${번호}`, exact: true });
  }

  탭(이름: string | RegExp): Locator {
    return this.page.getByRole('tab', { name: 이름 });
  }

  문의질문(글: string): Locator {
    return this.page.getByRole('tabpanel').getByRole('button', { name: 글 });
  }

  문의답변(글: string): Locator {
    return this.page.getByText(글, { exact: true });
  }

  async 옵션고르기(색상: string, 사이즈: string): Promise<void> {
    await this.색상.selectOption({ label: 색상 });
    await this.사이즈.selectOption({ label: 사이즈 });
  }

  async 수량적기(값: number | string): Promise<void> {
    await this.수량칸.fill(String(값));
  }

  async 담고응답받기(): Promise<number> {
    const [응답] = await Promise.all([
      this.page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/cart'),
      this.장바구니담기.click(),
    ]);
    return 응답.status();
  }

  async 담기두번누르기(): Promise<void> {
    await this.장바구니담기.click({ clickCount: 2 });
  }

  async 썸네일에올리기(번호: number): Promise<void> {
    await this.썸네일(번호).hover();
  }

  async 확대열기(): Promise<void> {
    await this.큰이미지버튼.click();
    await this.확대창.waitFor();
  }

  async 확대이미지번호(): Promise<number> {
    const 주소 = (await this.확대이미지.getAttribute('src')) ?? '';
    return Number(주소.split('/').pop());
  }

  async 확대창이화면을덮는가(): Promise<boolean> {
    const 상자 = await this.확대창.boundingBox();
    const 화면 = this.page.viewportSize();
    if (상자 === null || 화면 === null) return false;
    return 상자.width >= 화면.width && 상자.height >= 화면.height;
  }

  async 큰이미지주소(): Promise<string> {
    return (await this.큰이미지.getAttribute('src')) ?? '';
  }

  async 썸네일이미지주소(번호: number): Promise<string> {
    return (await this.썸네일(번호).locator('img').getAttribute('src')) ?? '';
  }

  async 갤러리가왼쪽인가(): Promise<boolean> {
    const 이미지 = await this.큰이미지버튼.boundingBox();
    const 제목 = await this.상품명.boundingBox();
    if (이미지 === null || 제목 === null) return false;
    return 이미지.x + 이미지.width <= 제목.x;
  }

  async 탭이아래인가(): Promise<boolean> {
    const 이미지 = await this.큰이미지버튼.boundingBox();
    const 탭 = await this.탭목록.boundingBox();
    if (이미지 === null || 탭 === null) return false;
    return 탭.y >= 이미지.y + 이미지.height;
  }

  async 시청수읽기(): Promise<number> {
    return Number(((await this.시청수.innerText()).match(/\d+/) ?? ['0'])[0]);
  }

  async 리뷰탭개수(): Promise<number> {
    return Number(((await this.탭(/^리뷰/).innerText()).match(/\d+/) ?? ['0'])[0]);
  }

  async 금액읽기(칸: Locator): Promise<number> {
    return Number((await 칸.innerText()).replace(/\D/g, ''));
  }

  async 탭이름들(): Promise<string[]> {
    return this.탭목록.getByRole('tab').allInnerTexts();
  }
}
