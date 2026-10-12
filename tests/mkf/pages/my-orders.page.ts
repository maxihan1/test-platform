import type { Locator, Page } from '@playwright/test';

export class 내주문내역화면 {
  static readonly 주소 = '/my/orders';

  readonly 제목: Locator;
  readonly 메뉴: Locator;
  readonly 메뉴링크들: Locator;
  readonly 기간묶음: Locator;
  readonly 기간버튼들: Locator;
  readonly 표: Locator;
  readonly 줄들: Locator;
  readonly 열머리들: Locator;
  readonly 빈안내: Locator;
  readonly 불러오는중: Locator;
  readonly 상태배지들: Locator;
  readonly 오류안내: Locator;
  readonly 주문번호링크들: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '주문 내역', level: 1 });
    this.메뉴 = page.getByRole('navigation', { name: '마이페이지 메뉴' });
    this.메뉴링크들 = this.메뉴.getByRole('link');
    this.기간묶음 = page.getByRole('group', { name: '조회 기간' });
    this.기간버튼들 = this.기간묶음.getByRole('button');
    this.표 = page.getByRole('table');
    this.줄들 = this.표.getByRole('row').filter({ has: page.getByRole('cell') });
    this.열머리들 = this.표.getByRole('columnheader');
    this.빈안내 = page.getByText('주문 내역이 없습니다', { exact: true });
    this.불러오는중 = page.getByLabel('불러오는 중');
    this.상태배지들 = this.표.locator('span.status');
    this.오류안내 = page.getByText('잠시 후 다시 시도해 주세요', { exact: true });
    this.주문번호링크들 = this.표.getByRole('link');
  }

  메뉴링크(이름: string): Locator {
    return this.메뉴.getByRole('link', { name: 이름, exact: true });
  }

  기간버튼(이름: '1개월' | '3개월' | '전체'): Locator {
    return this.기간묶음.getByRole('button', { name: 이름, exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto(내주문내역화면.주소);
    await this.표.or(this.빈안내).waitFor();
  }

  async 기간고르기(이름: '1개월' | '3개월' | '전체'): Promise<void> {
    await this.기간버튼(이름).click();
    await this.불러오는중.waitFor({ state: 'detached' });
    await this.표.or(this.빈안내).waitFor();
  }

  async 줄글들(): Promise<string[][]> {
    return this.줄들.evaluateAll((줄들) =>
      줄들.map((줄) => Array.from(줄.querySelectorAll('td')).map((칸) => (칸.textContent ?? '').trim())),
    );
  }

  async 상태색들(): Promise<string[]> {
    return this.상태배지들.evaluateAll((배지들) =>
      배지들.map((배지) => {
        const 스타일 = getComputedStyle(배지);
        return `${(배지.textContent ?? '').trim()}|${스타일.color}|${스타일.backgroundColor}`;
      }),
    );
  }
}
