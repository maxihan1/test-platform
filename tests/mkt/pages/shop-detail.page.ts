import type { Locator, Page } from '@playwright/test';

export class 상품상세 {
  constructor(private readonly page: Page) {}

  get 큰이미지버튼(): Locator {
    return this.page.getByRole('button', { name: '크게 보기' });
  }

  get 큰이미지(): Locator {
    return this.큰이미지버튼.getByRole('img');
  }

  썸네일(번호: number): Locator {
    return this.page.getByRole('button', { name: `이미지 ${번호}`, exact: true });
  }

  get 썸네일들(): Locator {
    return this.page.getByRole('button', { name: /^이미지 [1-4]$/ });
  }

  get 상품명(): Locator {
    return this.page.getByRole('heading', { level: 1 });
  }

  get 시청자수(): Locator {
    return this.page.locator('p.watching');
  }

  get 색상(): Locator {
    return this.page.getByRole('combobox', { name: '색상' });
  }

  get 사이즈(): Locator {
    return this.page.getByRole('combobox', { name: '사이즈' });
  }

  get 수량줄이기(): Locator {
    return this.page.getByRole('button', { name: '수량 줄이기' });
  }

  get 수량칸(): Locator {
    return this.page.getByRole('spinbutton', { name: '수량' });
  }

  get 수량늘리기(): Locator {
    return this.page.getByRole('button', { name: '수량 늘리기' });
  }

  get 총상품금액(): Locator {
    return this.page.locator('p.line-total strong');
  }

  get 장바구니담기(): Locator {
    return this.page.getByRole('button', { name: '장바구니 담기' });
  }

  get 바로구매(): Locator {
    return this.page.getByRole('button', { name: '바로 구매' });
  }

  get 품절버튼(): Locator {
    return this.page.getByRole('button', { name: '품절', exact: true });
  }

  get 탭목록(): Locator {
    return this.page.getByRole('tablist', { name: '상품 정보' });
  }

  get 설명탭(): Locator {
    return this.page.getByRole('tab', { name: '상품 설명' });
  }

  get 리뷰탭(): Locator {
    return this.page.getByRole('tab', { name: /^리뷰 \(\d+\)$/ });
  }

  get 문의탭(): Locator {
    return this.page.getByRole('tab', { name: '상품 문의' });
  }

  get 리뷰패널(): Locator {
    return this.page.getByRole('tabpanel', { name: /^리뷰 \(\d+\)$/ });
  }

  get 리뷰한건들(): Locator {
    return this.리뷰패널.getByRole('article');
  }

  get 리뷰불러오는중(): Locator {
    return this.page.getByText('리뷰를 불러오는 중…');
  }

  get 리뷰실패문구(): Locator {
    return this.page.getByText('리뷰를 불러오지 못했습니다');
  }

  get 다시시도(): Locator {
    return this.page.getByRole('button', { name: '다시 시도' });
  }

  get 문의패널(): Locator {
    return this.page.getByRole('tabpanel', { name: '상품 문의' });
  }

  질문(글자: string): Locator {
    return this.문의패널.getByRole('button', { name: 글자 });
  }

  get 질문들(): Locator {
    return this.문의패널.getByRole('button');
  }

  get 열린답변들(): Locator {
    return this.문의패널.locator('div.a:not([hidden])');
  }

  get 확대보기(): Locator {
    return this.page.getByRole('dialog', { name: '이미지 확대 보기' });
  }

  get 확대위치(): Locator {
    return this.확대보기.locator('.pos');
  }

  get 확대이미지(): Locator {
    return this.확대보기.getByRole('img');
  }

  get 확대닫기(): Locator {
    return this.확대보기.getByRole('button', { name: '닫기' });
  }

  get 확대이전(): Locator {
    return this.확대보기.getByRole('button', { name: '이전 이미지' });
  }

  get 확대다음(): Locator {
    return this.확대보기.getByRole('button', { name: '다음 이미지' });
  }

  async 열기(상품번호: number): Promise<void> {
    await this.page.goto(`/shop/${상품번호}`);
    await this.상품명.waitFor();
  }

  async 수량을끝까지올린다(): Promise<void> {
    for (let 번 = 0; 번 < 12 && !(await this.수량늘리기.isDisabled()); 번 += 1) {
      await this.수량늘리기.click();
    }
  }

  async 갤러리배치(): Promise<{ 큰이미지가왼쪽: boolean; 썸네일이아래: boolean }> {
    const 큰 = await this.큰이미지버튼.boundingBox();
    const 이름 = await this.상품명.boundingBox();
    const 첫썸네일 = await this.썸네일(1).boundingBox();
    return {
      큰이미지가왼쪽: 큰 !== null && 이름 !== null && 큰.x + 큰.width <= 이름.x + 1,
      썸네일이아래: 큰 !== null && 첫썸네일 !== null && 큰.y + 큰.height <= 첫썸네일.y + 1,
    };
  }

  async 확대보기가화면을덮는가(): Promise<boolean> {
    const 상자 = await this.확대보기.boundingBox();
    const 화면 = this.page.viewportSize();
    return 상자 !== null && 화면 !== null && 상자.x <= 0 && 상자.y <= 0 && 상자.width >= 화면.width && 상자.height >= 화면.height;
  }

  async 큰이미지를기다린다(주소: string): Promise<void> {
    await this.큰이미지버튼.locator(`img[src="${주소}"]`).waitFor();
  }

  async 큰이미지주소(): Promise<string> {
    return (await this.큰이미지.getAttribute('src')) ?? '';
  }

  async 현재썸네일번호(): Promise<string> {
    const 값들 = await this.썸네일들.evaluateAll((칸들) => 칸들.filter((칸) => 칸.getAttribute('aria-current') === 'true').map((칸) => 칸.getAttribute('aria-label') ?? ''));
    return 값들.join(', ');
  }

  async 썸네일에올린다(번호: number): Promise<void> {
    await this.썸네일(번호).dispatchEvent('mouseenter');
  }

  async 옵션을고른다(색상: string, 사이즈: string): Promise<void> {
    await this.색상.selectOption({ label: 색상 });
    await this.사이즈.selectOption({ label: 사이즈 });
  }

  async 모두펼친질문수(): Promise<number> {
    return this.질문들.evaluateAll((칸들) => 칸들.filter((칸) => 칸.getAttribute('aria-expanded') === 'true').length);
  }

  async 질문이펼쳐졌는가(글자: string): Promise<boolean> {
    return (await this.질문(글자).getAttribute('aria-expanded')) === 'true';
  }
}
