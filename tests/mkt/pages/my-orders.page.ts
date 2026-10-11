import type { Locator, Page } from '@playwright/test';

export class 주문내역화면 {
  static readonly 주소 = '/my/orders';

  readonly page: Page;
  readonly 제목: Locator;
  readonly 메뉴: Locator;
  readonly 표: Locator;
  readonly 열머리들: Locator;
  readonly 줄들: Locator;

  constructor(page: Page) {
    this.page = page;
    this.제목 = page.getByRole('heading', { name: '주문 내역', level: 1 });
    this.메뉴 = page.getByRole('navigation', { name: '마이페이지 메뉴' });
    this.표 = page.getByRole('table');
    this.열머리들 = this.표.getByRole('columnheader');
    this.줄들 = this.표.locator('tbody').getByRole('row');
  }

  async 열기(): Promise<void> {
    await this.page.goto(주문내역화면.주소);
    await this.표.waitFor();
  }

  async 응답기다리지않고열기(): Promise<void> {
    await this.page.goto(주문내역화면.주소);
  }

  메뉴링크(이름: string): Locator {
    return this.메뉴.getByRole('link', { name: 이름, exact: true });
  }

  기간버튼(이름: string): Locator {
    return this.page.getByRole('group', { name: '조회 기간' }).getByRole('button', { name: 이름, exact: true });
  }

  async 기간누르기(이름: string): Promise<void> {
    await this.기간버튼(이름).click();
    await this.표.waitFor();
  }

  줄(주문번호: string): Locator {
    return this.줄들.filter({ has: this.page.getByRole('link', { name: 주문번호 }) });
  }

  외건수표시(주문번호: string): Locator {
    return this.줄(주문번호).getByText('외 1건');
  }

  상태배지(줄: Locator): Locator {
    return 줄.locator('.status');
  }

  async 날짜들(): Promise<string[]> {
    return this.줄들.evaluateAll((줄들) => 줄들.map((줄) => (줄.querySelector('td')?.textContent ?? '').trim()));
  }

  async 주문번호들(): Promise<string[]> {
    return this.줄들.evaluateAll((줄들) => 줄들.map((줄) => (줄 as HTMLElement).dataset.id ?? ''));
  }

  async 빈칸있는줄수(): Promise<number> {
    return this.줄들.evaluateAll(
      (줄들) => 줄들.filter((줄) => [...줄.querySelectorAll('td')].length !== 5 || [...줄.querySelectorAll('td')].some((칸) => !(칸.textContent ?? '').trim())).length,
    );
  }

  async 상태색들(): Promise<{ 상태: string; 색: string }[]> {
    return this.줄들.locator('.status').evaluateAll((배지들) =>
      배지들.map((배지) => {
        const 모양 = getComputedStyle(배지);
        return { 상태: (배지.textContent ?? '').trim(), 색: `${모양.color}/${모양.backgroundColor}` };
      }),
    );
  }

  async 줄의주문번호(번째: number): Promise<string> {
    const 번호 = await this.줄들.nth(번째).getAttribute('data-id');
    return 번호 ?? '';
  }

  async 줄누르기(번째: number): Promise<void> {
    await this.줄들.nth(번째).locator('td').first().click();
  }
}
