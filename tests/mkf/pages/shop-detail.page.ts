import type { Locator, Page } from '@playwright/test';

export class 상품상세화면 {
  static readonly 주소 = '/shop/1';

  readonly 제목: Locator;
  readonly 큰이미지버튼: Locator;
  readonly 큰이미지: Locator;
  readonly 썸네일들: Locator;
  readonly 보고있어요: Locator;
  readonly 색상: Locator;
  readonly 사이즈: Locator;
  readonly 수량: Locator;
  readonly 줄이기: Locator;
  readonly 늘리기: Locator;
  readonly 총금액: Locator;
  readonly 담기: Locator;
  readonly 담기처리중: Locator;
  readonly 바로구매: Locator;
  readonly 품절버튼: Locator;
  readonly 설명탭: Locator;
  readonly 리뷰탭: Locator;
  readonly 문의탭: Locator;
  readonly 설명패널: Locator;
  readonly 리뷰패널: Locator;
  readonly 문의패널: Locator;
  readonly 질문들: Locator;
  readonly 리뷰글들: Locator;
  readonly 리뷰실패문구: Locator;
  readonly 다시시도: Locator;
  readonly 확대창: Locator;
  readonly 확대위치: Locator;
  readonly 확대이전: Locator;
  readonly 확대다음: Locator;
  readonly 확대닫기: Locator;
  readonly 못찾음제목: Locator;
  readonly 쇼핑으로: Locator;
  readonly 불러오는중: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { level: 1 });
    this.큰이미지버튼 = page.getByRole('button', { name: '크게 보기' });
    this.큰이미지 = this.큰이미지버튼.getByRole('img');
    this.썸네일들 = page.getByRole('button', { name: /^이미지 \d$/ });
    this.보고있어요 = page.getByText(/명이 보고 있어요$/);
    this.색상 = page.getByLabel('색상', { exact: true });
    this.사이즈 = page.getByLabel('사이즈', { exact: true });
    this.수량 = page.getByLabel('수량', { exact: true });
    this.줄이기 = page.getByRole('button', { name: '수량 줄이기' });
    this.늘리기 = page.getByRole('button', { name: '수량 늘리기' });
    this.총금액 = page.getByText(/^총 상품 금액/);
    this.담기 = page.getByRole('button', { name: '장바구니 담기' });
    this.담기처리중 = page.locator('button.add-cart');
    this.바로구매 = page.getByRole('button', { name: '바로 구매' });
    this.품절버튼 = page.getByRole('button', { name: '품절', exact: true });
    this.설명탭 = page.getByRole('tab', { name: '상품 설명' });
    this.리뷰탭 = page.getByRole('tab', { name: /^리뷰 \(\d+\)$/ });
    this.문의탭 = page.getByRole('tab', { name: '상품 문의' });
    this.설명패널 = page.getByRole('tabpanel', { name: '상품 설명' });
    this.리뷰패널 = page.getByRole('tabpanel', { name: /^리뷰/ });
    this.문의패널 = page.getByRole('tabpanel', { name: '상품 문의' });
    this.질문들 = this.문의패널.getByRole('button');
    this.리뷰글들 = this.리뷰패널.getByRole('article');
    this.리뷰실패문구 = page.getByText('리뷰를 불러오지 못했습니다');
    this.다시시도 = page.getByRole('button', { name: '다시 시도' });
    this.확대창 = page.getByRole('dialog', { name: '이미지 확대 보기' });
    this.확대위치 = this.확대창.getByText(/^\d \/ 4$/);
    this.확대이전 = this.확대창.getByRole('button', { name: '이전 이미지' });
    this.확대다음 = this.확대창.getByRole('button', { name: '다음 이미지' });
    this.확대닫기 = this.확대창.getByRole('button', { name: '닫기' });
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

  async 늘리기누르기(횟수: number): Promise<void> {
    for (let 번 = 0; 번 < 횟수; 번 += 1) await this.늘리기.click();
  }

  async 늘리기끝까지누르기(최대횟수: number): Promise<void> {
    for (let 번 = 0; 번 < 최대횟수; 번 += 1) await this.늘리기.click({ force: true });
  }

  async 옵션고르기(색상?: string, 사이즈?: string): Promise<void> {
    if (색상 !== undefined) await this.색상.selectOption(색상);
    if (사이즈 !== undefined) await this.사이즈.selectOption(사이즈);
  }

  async 총금액숫자(): Promise<number> {
    return Number((await this.총금액.innerText()).replace(/[^0-9]/g, ''));
  }

  async 보고있는수(): Promise<number> {
    return Number((await this.보고있어요.innerText()).replace(/[^0-9]/g, ''));
  }

  async 확대위치번호(): Promise<number> {
    return Number(/^(\d) \/ 4$/.exec(await this.확대위치.innerText())?.[1] ?? 'NaN');
  }

  async 확대가화면전체인가(): Promise<boolean> {
    const 상자 = await this.확대창.boundingBox();
    const 화면 = this.page.viewportSize();
    return 상자 !== null && 화면 !== null && 상자.width >= 화면.width && 상자.height >= 화면.height;
  }

  async 확대위치가위쪽인가(): Promise<boolean> {
    const 상자 = await this.확대위치.boundingBox();
    const 화면 = this.page.viewportSize();
    return 상자 !== null && 화면 !== null && 상자.y < 화면.height / 2;
  }

  async 갤러리가제목왼쪽인가(): Promise<boolean> {
    const 큰 = await this.큰이미지버튼.boundingBox();
    const 제목 = await this.제목.boundingBox();
    return 큰 !== null && 제목 !== null && 큰.x + 큰.width <= 제목.x + 1;
  }

  async 썸네일이큰이미지아래인가(): Promise<boolean> {
    const 큰 = await this.큰이미지버튼.boundingBox();
    const 윗자리들 = await this.썸네일들.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top + window.scrollY));
    const 큰아래 = 큰 === null ? Number.NaN : 큰.y + 큰.height;
    return 윗자리들.length > 0 && 윗자리들.every((윗자리) => 윗자리 >= 큰아래 - 1);
  }

  async 답변(질문: Locator): Promise<Locator> {
    const 번호 = await 질문.getAttribute('aria-controls');
    return this.page.locator(`#${번호 ?? ''}`);
  }

  async 답변이보이는가(질문: Locator): Promise<boolean> {
    return (await this.답변(질문)).isVisible();
  }

  async 리뷰불러오기기다리기(): Promise<void> {
    for (let 번 = 0; 번 < 6; 번 += 1) {
      await this.리뷰글들.first().or(this.다시시도).first().waitFor();
      if (!(await this.다시시도.isVisible())) return;
      await this.다시시도.click();
    }
  }

  async 보고있는수갱신기록하기(): Promise<void> {
    await this.보고있어요.evaluate((요소) => {
      const 기록 = window as unknown as { __보고있는수갱신: number[] };
      const 시작 = performance.now();
      기록.__보고있는수갱신 = [];
      new MutationObserver(() => {
        기록.__보고있는수갱신.push(Math.round(performance.now() - 시작));
      }).observe(요소, { childList: true, characterData: true, subtree: true });
    });
  }

  async 보고있는수갱신간격들(): Promise<number[]> {
    const 시각들 = await this.page.evaluate(() => (window as unknown as { __보고있는수갱신: number[] }).__보고있는수갱신);
    return 시각들.slice(1).map((시각, 번) => 시각 - (시각들[번] ?? 0));
  }
}
