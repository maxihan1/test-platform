import type { Locator, Page } from '@playwright/test';

export class 상품상세화면 {
  static readonly 주소 = '/shop/1';

  readonly 제목: Locator;
  readonly 큰이미지버튼: Locator;
  readonly 큰이미지: Locator;
  readonly 색상: Locator;
  readonly 사이즈: Locator;
  readonly 수량: Locator;
  readonly 줄이기: Locator;
  readonly 늘리기: Locator;
  readonly 총금액: Locator;
  readonly 리뷰탭: Locator;
  readonly 문의탭: Locator;
  readonly 리뷰패널: Locator;
  readonly 문의패널: Locator;
  readonly 리뷰글들: Locator;
  readonly 다시시도: Locator;
  readonly 확대창: Locator;
  readonly 확대위치: Locator;
  readonly 확대다음: Locator;
  readonly 못찾음제목: Locator;
  readonly 쇼핑으로: Locator;
  readonly 불러오는중: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { level: 1 });
    this.큰이미지버튼 = page.getByRole('button', { name: '크게 보기' });
    this.큰이미지 = this.큰이미지버튼.getByRole('img');
    this.색상 = page.getByLabel('색상', { exact: true });
    this.사이즈 = page.getByLabel('사이즈', { exact: true });
    this.수량 = page.getByLabel('수량', { exact: true });
    this.줄이기 = page.getByRole('button', { name: '수량 줄이기' });
    this.늘리기 = page.getByRole('button', { name: '수량 늘리기' });
    this.총금액 = page.getByText(/^총 상품 금액/);
    this.리뷰탭 = page.getByRole('tab', { name: /^리뷰 \(\d+\)$/ });
    this.문의탭 = page.getByRole('tab', { name: '상품 문의' });
    this.리뷰패널 = page.getByRole('tabpanel', { name: /^리뷰/ });
    this.문의패널 = page.getByRole('tabpanel', { name: '상품 문의' });
    this.리뷰글들 = this.리뷰패널.getByRole('article');
    this.다시시도 = page.getByRole('button', { name: '다시 시도' });
    this.확대창 = page.getByRole('dialog', { name: '이미지 확대 보기' });
    this.확대위치 = this.확대창.getByText(/^\d \/ 4$/);
    this.확대다음 = this.확대창.getByRole('button', { name: '다음 이미지' });
    this.못찾음제목 = page.getByRole('heading', { name: '상품을 찾을 수 없습니다' });
    this.쇼핑으로 = page.getByRole('link', { name: '쇼핑으로' });
    this.불러오는중 = page.locator('.detail-loading');
  }

  async 열기(번호 = 1): Promise<void> {
    await this.page.goto(`/shop/${String(번호)}`);
  }

  async 화면기다리기(): Promise<void> {
    await this.큰이미지버튼.waitFor();
  }

  async 불러오기끝나기를기다리기(): Promise<void> {
    await this.불러오는중.waitFor({ state: 'detached' });
  }

  썸네일(번호: number): Locator {
    return this.page.getByRole('button', { name: `이미지 ${String(번호)}`, exact: true });
  }

  리뷰탭글(개수: number): Locator {
    return this.page.getByRole('tab', { name: `리뷰 (${String(개수)})`, exact: true });
  }

  질문(글: string): Locator {
    return this.문의패널.getByRole('button', { name: 글, exact: true });
  }

  답변(글: string): Locator {
    return this.문의패널.getByText(글, { exact: true });
  }

  async 큰이미지주소(): Promise<string> {
    return (await this.큰이미지.getAttribute('src')) ?? '';
  }

  async 썸네일이미지주소(번호: number): Promise<string> {
    return (await this.썸네일(번호).locator('img').getAttribute('src')) ?? '';
  }

  async 수량값(): Promise<string> {
    return this.수량.inputValue();
  }

  async 수량적기(값: string): Promise<void> {
    await this.수량.fill(값);
    await this.수량.blur();
  }

  async 총금액숫자(): Promise<number> {
    return Number((await this.총금액.innerText()).replace(/[^0-9]/g, ''));
  }

  async 선택상자의선택글(상자: Locator): Promise<string> {
    return 상자.evaluate((el) => (el as HTMLSelectElement).selectedOptions[0]?.textContent ?? '');
  }

  async 확대위치번호(): Promise<number> {
    return Number(/^(\d) \/ 4$/.exec(await this.확대위치.innerText())?.[1] ?? 'NaN');
  }

  async 리뷰불러오기기다리기(): Promise<void> {
    for (let 번 = 0; 번 < 6; 번 += 1) {
      await this.리뷰글들.first().or(this.다시시도).first().waitFor();
      if (!(await this.다시시도.isVisible())) return;
      await this.다시시도.click();
    }
  }
}
