import type { Locator, Page } from '@playwright/test';

export class 내주문내역화면 {
  static readonly 주소 = '/my/orders';

  readonly 제목: Locator;
  readonly 표: Locator;
  readonly 줄들: Locator;
  readonly 빈안내: Locator;

  constructor(readonly page: Page) {
    this.제목 = page.getByRole('heading', { name: '주문 내역', level: 1 });
    this.표 = page.getByRole('table');
    this.줄들 = this.표.getByRole('row').filter({ has: page.getByRole('cell') });
    this.빈안내 = page.getByText('주문 내역이 없습니다', { exact: true });
  }

  async 열기(): Promise<void> {
    await this.page.goto(내주문내역화면.주소);
  }

  기간버튼(이름: '1개월' | '3개월' | '전체'): Locator {
    return this.page.getByRole('group', { name: '조회 기간' }).getByRole('button', { name: 이름, exact: true });
  }

  골라진기간버튼(이름: '1개월' | '3개월' | '전체'): Locator {
    return this.page.getByRole('group', { name: '조회 기간' }).getByRole('button', { name: 이름, exact: true, pressed: true });
  }

  주문줄(주문번호: string): Locator {
    return this.줄들.filter({ hasText: 주문번호 });
  }
}
