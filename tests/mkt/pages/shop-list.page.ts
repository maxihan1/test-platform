import type { Locator, Page } from '@playwright/test';

export class 상품목록화면 {
  static readonly 주소 = '/shop';

  readonly 제목: Locator;
  readonly 필터: Locator;
  readonly 카테고리들: Locator;
  readonly 가격슬라이더: Locator;
  readonly 가격표시: Locator;
  readonly 품절제외: Locator;
  readonly 검색칸: Locator;
  readonly 자동완성: Locator;
  readonly 자동완성항목: Locator;
  readonly 총개수: Locator;
  readonly 정렬: Locator;
  readonly 정렬옵션: Locator;
  readonly 카드들: Locator;
  readonly 빈카드들: Locator;
  readonly 품절카드들: Locator;
  readonly 할인카드들: Locator;
  readonly 없음문구: Locator;
  readonly 마지막문구: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('main').getByRole('heading', { name: '쇼핑', level: 1 });
    this.필터 = page.getByRole('complementary', { name: '상품 필터' });
    this.카테고리들 = this.필터.getByRole('group', { name: '카테고리' }).getByRole('checkbox');
    this.가격슬라이더 = this.필터.getByRole('slider', { name: '최대 가격' });
    this.가격표시 = this.필터.getByRole('status');
    this.품절제외 = this.필터.getByRole('checkbox', { name: '품절 상품 제외' });
    this.검색칸 = page.getByRole('combobox', { name: '상품 검색' });
    this.자동완성 = page.getByRole('listbox', { name: '자동완성' });
    this.자동완성항목 = this.자동완성.getByRole('option');
    this.총개수 = page.getByText(/^총 \d+개$/);
    this.정렬 = page.getByLabel('정렬', { exact: true });
    this.정렬옵션 = this.정렬.getByRole('option');
    this.카드들 = page.locator('a.product');
    this.빈카드들 = page.locator('.product-skel');
    this.품절카드들 = page.locator('a.product.soldout');
    this.할인카드들 = page.locator('a.product').filter({ has: page.locator('.rate') });
    this.없음문구 = page.getByText('조건에 맞는 상품이 없습니다');
    this.마지막문구 = page.getByText('마지막 상품입니다');
  }

  async 열기(): Promise<void> {
    await this.page.goto(상품목록화면.주소);
  }

  async 첫화면기다리기(): Promise<void> {
    await this.카드들.first().waitFor();
  }

  async 끝까지내리기(): Promise<void> {
    await this.page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight);
    });
  }

  async 맨위로올리기(): Promise<void> {
    await this.page.evaluate(() => {
      window.scrollTo(0, 0);
    });
  }

  async 모두내리기(): Promise<void> {
    for (let 번 = 0; 번 < 10; 번 += 1) {
      if (await this.마지막문구.isVisible()) return;
      const 수 = await this.카드들.count();
      await this.끝까지내리기();
      await this.page.waitForFunction(
        (n) => document.querySelectorAll('a.product').length > n || document.querySelector('.list-end')?.hasAttribute('hidden') === false,
        수,
      );
    }
  }

  async 카드윗자리들(): Promise<number[]> {
    return this.카드들.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top + window.scrollY)));
  }

  async 카드이름들(): Promise<string[]> {
    return this.카드들.locator('.name').allInnerTexts();
  }

  async 판매가들(): Promise<number[]> {
    const 글들 = await this.카드들.locator('.sale').allInnerTexts();
    return 글들.map((글) => Number(글.replace(/[^0-9]/g, '')));
  }

  async 리뷰수들(): Promise<number[]> {
    const 글들 = await this.카드들.locator('.stars').allInnerTexts();
    return 글들.map((글) => Number(/\((\d+)\)/.exec(글)?.[1] ?? 'NaN'));
  }

  async 체크된카테고리수(): Promise<number> {
    return this.카테고리들.evaluateAll((els) => els.filter((el) => (el as HTMLInputElement).checked).length);
  }

  async 선택된정렬글(): Promise<string> {
    return this.정렬.evaluate((el) => (el as HTMLSelectElement).selectedOptions[0]?.textContent ?? '');
  }

  async 슬라이더맞추기(값: number): Promise<void> {
    await this.가격슬라이더.fill(String(값));
  }

  async 슬라이더넣기(값: number): Promise<void> {
    await this.가격슬라이더.evaluate((el, 넣을값) => {
      (el as HTMLInputElement).value = 넣을값;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, String(값));
  }

  카테고리(이름: string): Locator {
    return this.필터.getByRole('checkbox', { name: 이름, exact: true });
  }

  async 할인카드구성들(): Promise<boolean[]> {
    return this.할인카드들.evaluateAll((els) =>
      els.map((el) =>
        ['img', '.name', '.sale', '.rate', '.stars'].every((선택자) => {
          const 요소 = el.querySelector(선택자);
          if (요소 === null) return false;
          const 상자 = 요소.getBoundingClientRect();
          return 상자.width > 0 && 상자.height > 0;
        }),
      ),
    );
  }

  async 할인카드원가줄들(): Promise<string[]> {
    return this.할인카드들.evaluateAll((els) => els.map((el) => getComputedStyle(el.querySelector('.origin') ?? el).textDecorationLine));
  }

  async 할인카드가격색들(): Promise<string[]> {
    return this.할인카드들.evaluateAll((els) => els.map((el) => getComputedStyle(el.querySelector('.sale') ?? el).color));
  }

  async 품절카드덮개들(): Promise<{ 글: string; 색: string }[]> {
    return this.품절카드들.evaluateAll((els) =>
      els.map((el) => ({ 글: getComputedStyle(el, '::after').content.replace(/^"|"$/g, ''), 색: getComputedStyle(el, '::after').backgroundColor })),
    );
  }
}
