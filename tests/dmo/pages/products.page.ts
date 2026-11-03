import type { ElementHandle, Locator, Page } from '@playwright/test';

import { 운영틀 } from '../components/ops-frame.component.js';
import { 토스트 } from '../components/toast.component.js';

export interface 화면상품값 {
  가격: number;
  할인율: number;
  재고: number;
}

export class 상품관리화면 {
  static readonly 주소 = '/ops/products';
  readonly 틀: 운영틀;
  readonly 토스트: 토스트;
  readonly 제목: Locator;
  readonly 분류: Locator;
  readonly 검색칸: Locator;
  readonly 총개수: Locator;
  readonly 표: Locator;
  readonly 빈안내: Locator;
  readonly 상품링크들: Locator;

  constructor(readonly page: Page) {
    this.틀 = new 운영틀(page);
    this.토스트 = new 토스트(page);
    this.제목 = page.getByRole('heading', { name: '상품 관리', level: 1 });
    this.분류 = page.getByRole('combobox', { name: '분류' });
    this.검색칸 = page.getByRole('searchbox', { name: '검색' });
    this.총개수 = page.getByText(/^총 \d+개$/);
    this.표 = page.getByRole('table');
    this.빈안내 = page.getByText('조건에 맞는 상품이 없습니다');
    this.상품링크들 = this.표.getByRole('link', { name: / ↗$/ });
  }

  async 열기(): Promise<void> {
    await this.page.goto(상품관리화면.주소);
    await this.틀.다그려질때까지();
    await this.표.or(this.빈안내).waitFor();
  }

  async 옛표잡기(): Promise<ElementHandle | null> {
    return this.표.or(this.빈안내).elementHandle();
  }

  async 다시그려질때까지(옛표: ElementHandle | null): Promise<void> {
    await 옛표?.waitForElementState('hidden');
  }

  가격칸(상품명: string): Locator {
    return this.page.getByRole('spinbutton', { name: `${상품명} 가격`, exact: true });
  }

  할인율칸(상품명: string): Locator {
    return this.page.getByRole('spinbutton', { name: `${상품명} 할인율`, exact: true });
  }

  재고칸(상품명: string): Locator {
    return this.page.getByRole('spinbutton', { name: `${상품명} 재고`, exact: true });
  }

  상품줄(상품명: string): Locator {
    return this.page.getByRole('row').filter({ has: this.가격칸(상품명) });
  }

  판매가(상품명: string): Locator {
    return this.상품줄(상품명).getByText(/^[\d,]+원$/);
  }

  저장버튼(상품명: string): Locator {
    return this.상품줄(상품명).getByRole('button', { name: '저장', exact: true });
  }

  상품링크(상품명: string): Locator {
    return this.상품줄(상품명).getByRole('link', { name: `${상품명} ↗`, exact: true });
  }

  async 값들(상품명: string): Promise<화면상품값> {
    return {
      가격: Number(await this.가격칸(상품명).inputValue()),
      할인율: Number(await this.할인율칸(상품명).inputValue()),
      재고: Number(await this.재고칸(상품명).inputValue()),
    };
  }

  async 값적기(상품명: string, 값: Partial<화면상품값>): Promise<void> {
    if (값.가격 !== undefined) await this.가격칸(상품명).fill(String(값.가격));
    if (값.할인율 !== undefined) await this.할인율칸(상품명).fill(String(값.할인율));
    if (값.재고 !== undefined) await this.재고칸(상품명).fill(String(값.재고));
  }

  async 저장하기(상품명: string): Promise<string> {
    await this.저장버튼(상품명).click();
    return this.토스트.목록.first().innerText();
  }

  async 분류고르기(분류: string): Promise<void> {
    const 옛 = await this.옛표잡기();
    await this.분류.selectOption(분류);
    await this.다시그려질때까지(옛);
  }

  async 검색(글: string): Promise<void> {
    const 옛 = await this.옛표잡기();
    await this.검색칸.fill(글);
    await this.다시그려질때까지(옛);
  }

  async 표시된상품명들(): Promise<string[]> {
    const 글들 = await this.상품링크들.allInnerTexts();
    return 글들.map((글) => 글.replace(/ ↗$/, '').trim());
  }

  async 상품링크누르기(상품명: string): Promise<Page | null> {
    const 열림 = this.page.context().waitForEvent('page', { timeout: 10_000 }).catch(() => null);
    await this.상품링크(상품명).click();
    return 열림;
  }
}
